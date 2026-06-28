// In-memory source store: CRUD operations with domain-indexed lookup.

import {
  type Result,
  ok,
  err,
  NotFoundError,
  asIsoTimestamp,
} from "@veritas/core";
import { type Source, type CreateSource, type UpdateSource } from "@veritas/contracts";
import type { SourceQuery } from "./types.js";
import { buildSource } from "./source.js";
import { DuplicateSourceError } from "./errors.js";
import { normalizeDomainOrEmpty } from "./normalizer.js";

/** Port interface for source persistence — swap in-memory impl for DB adapter. */
export interface SourceStore {
  findById(id: string): Result<Source, NotFoundError>;
  findByUrl(url: string): Source | undefined;
  findByDomain(domain: string): readonly Source[];
  query(opts: SourceQuery): readonly Source[];
  save(input: CreateSource): Result<Source, DuplicateSourceError | Error>;
  update(id: string, patch: UpdateSource): Result<Source, NotFoundError | Error>;
  remove(id: string): Result<true, NotFoundError>;
  count(): number;
}

/** Create a new in-memory SourceStore instance. */
export function createInMemorySourceStore(): SourceStore {
  const byId = new Map<string, Source>();
  const byUrl = new Map<string, string>(); // url -> id
  const byDomain = new Map<string, Set<string>>(); // domain -> ids

  function indexDomain(source: Source): void {
    const domain = source.domain;
    if (!byDomain.has(domain)) byDomain.set(domain, new Set());
    (byDomain.get(domain) as Set<string>).add(source.id);
  }

  function deindexDomain(source: Source): void {
    byDomain.get(source.domain)?.delete(source.id);
  }

  return {
    findById(id) {
      const source = byId.get(id);
      if (!source) return err(new NotFoundError({ message: `Source "${id}" not found.` }));
      return ok(source);
    },

    findByUrl(url) {
      const id = byUrl.get(url);
      return id != null ? byId.get(id) : undefined;
    },

    findByDomain(domain) {
      const normalized = normalizeDomainOrEmpty(domain);
      const ids = byDomain.get(normalized) ?? new Set<string>();
      return Array.from(ids)
        .map((id) => byId.get(id))
        .filter((s): s is Source => s != null);
    },

    query(opts) {
      let results: Source[] = Array.from(byId.values());

      if (opts.domain !== undefined) {
        const norm = normalizeDomainOrEmpty(opts.domain);
        results = results.filter((s) => s.domain === norm);
      }
      if (opts.tier !== undefined) {
        results = results.filter((s) => s.tier === opts.tier);
      }
      if (opts.publisher !== undefined) {
        const pub = opts.publisher.toLowerCase();
        results = results.filter((s) => s.publisher?.toLowerCase().includes(pub));
      }

      const offset = opts.offset ?? 0;
      const limit = opts.limit ?? results.length;
      return results.slice(offset, offset + limit);
    },

    save(input) {
      if (byUrl.has(input.url)) {
        return err(new DuplicateSourceError(input.url));
      }
      const result = buildSource(input);
      if (!result.ok) return result as Result<Source, Error>;
      const source = result.value;
      byId.set(source.id, source);
      byUrl.set(source.url, source.id);
      indexDomain(source);
      return ok(source);
    },

    update(id, patch) {
      const existing = byId.get(id);
      if (!existing) return err(new NotFoundError({ message: `Source "${id}" not found.` }));

      // If URL changes, re-index.
      if (patch.url !== undefined && patch.url !== existing.url) {
        if (byUrl.has(patch.url)) {
          return err(new DuplicateSourceError(patch.url));
        }
        byUrl.delete(existing.url);
        byUrl.set(patch.url, id);
      }

      const updated: Source = {
        ...existing,
        ...(patch.url !== undefined ? { url: patch.url } : {}),
        ...(patch.title !== undefined ? { title: patch.title ?? null } : {}),
        ...(patch.publisher !== undefined ? { publisher: patch.publisher ?? null } : {}),
        ...(patch.tier !== undefined ? { tier: patch.tier } : {}),
        ...(patch.publishedAt !== undefined ? { publishedAt: patch.publishedAt ?? null } : {}),
        ...(patch.excerpt !== undefined ? { excerpt: patch.excerpt ?? null } : {}),
        updatedAt: asIsoTimestamp(new Date().toISOString()),
      };

      deindexDomain(existing);
      byId.set(id, updated);
      indexDomain(updated);
      return ok(updated);
    },

    remove(id) {
      const source = byId.get(id);
      if (!source) return err(new NotFoundError({ message: `Source "${id}" not found.` }));
      byId.delete(id);
      byUrl.delete(source.url);
      deindexDomain(source);
      return ok(true);
    },

    count() {
      return byId.size;
    },
  };
}
