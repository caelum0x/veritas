// Source registry: in-memory store keyed by domain and source ID.

import {
  type Result, ok, err,
  NotFoundError, ConflictError,
  newSourceId, type SourceId,
  asIsoTimestamp,
} from "@veritas/core";
import { type Source, type CreateSource, type UpdateSource } from "@veritas/contracts";
import { normalizeDomainOrEmpty } from "./normalizer.js";
import { classifySource, sourceClassToTier } from "./classifier.js";

export interface SourceRegistry {
  register(input: CreateSource): Result<Source>;
  update(id: SourceId, patch: UpdateSource): Result<Source>;
  remove(id: SourceId): Result<void>;
  findById(id: SourceId): Result<Source>;
  findByDomain(domain: string): readonly Source[];
  findByUrl(url: string): Result<Source>;
  list(): readonly Source[];
}

export function createSourceRegistry(): SourceRegistry {
  const byId = new Map<string, Source>();
  const byDomainKey = new Map<string, string>(); // normalized domain -> id

  const now = () => asIsoTimestamp(new Date().toISOString());

  function domainKey(url: string): string {
    return normalizeDomainOrEmpty(url);
  }

  function register(input: CreateSource): Result<Source> {
    const key = domainKey(input.url);
    if (byDomainKey.has(key)) {
      const existingId = byDomainKey.get(key)!;
      return err(new ConflictError({ message: `Source already registered: ${existingId}`, details: { field: "url" } }));
    }

    const domain = key;
    const tier = input.tier ?? sourceClassToTier(classifySource(domain, input.url).sourceClass);
    const id = newSourceId();
    const timestamp = now();

    const source: Source = {
      id,
      url: input.url,
      domain,
      title: input.title ?? null,
      publisher: input.publisher ?? null,
      tier,
      publishedAt: input.publishedAt ?? null,
      retrievedAt: timestamp,
      contentHash: null,
      excerpt: input.excerpt ?? null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    byId.set(id, source);
    byDomainKey.set(key, id);
    return ok(source);
  }

  function update(id: SourceId, patch: UpdateSource): Result<Source> {
    const existing = byId.get(id);
    if (!existing) return err(new NotFoundError({ message: `Source not found: ${id}` }));

    const newDomain = patch.url !== undefined ? domainKey(patch.url) : existing.domain;

    const updated: Source = {
      ...existing,
      ...(patch.url !== undefined ? { url: patch.url, domain: newDomain } : {}),
      ...(patch.title !== undefined ? { title: patch.title ?? null } : {}),
      ...(patch.publisher !== undefined ? { publisher: patch.publisher ?? null } : {}),
      ...(patch.tier !== undefined ? { tier: patch.tier } : {}),
      ...(patch.publishedAt !== undefined ? { publishedAt: patch.publishedAt ?? null } : {}),
      ...(patch.excerpt !== undefined ? { excerpt: patch.excerpt ?? null } : {}),
      updatedAt: now(),
    };

    byId.set(id, updated);
    if (patch.url !== undefined) {
      byDomainKey.delete(domainKey(existing.url));
      byDomainKey.set(newDomain, id);
    }
    return ok(updated);
  }

  function remove(id: SourceId): Result<void> {
    const existing = byId.get(id);
    if (!existing) return err(new NotFoundError({ message: `Source not found: ${id}` }));
    byId.delete(id);
    byDomainKey.delete(domainKey(existing.url));
    return ok(undefined);
  }

  function findById(id: SourceId): Result<Source> {
    const source = byId.get(id);
    if (!source) return err(new NotFoundError({ message: `Source not found: ${id}` }));
    return ok(source);
  }

  function findByDomain(domain: string): readonly Source[] {
    return Array.from(byId.values()).filter((s) => s.domain === domain);
  }

  function findByUrl(url: string): Result<Source> {
    const key = domainKey(url);
    const id = byDomainKey.get(key);
    if (!id) return err(new NotFoundError({ message: `Source not found for URL: ${url}` }));
    return ok(byId.get(id)!);
  }

  function list(): readonly Source[] {
    return Array.from(byId.values());
  }

  return { register, update, remove, findById, findByDomain, findByUrl, list };
}
