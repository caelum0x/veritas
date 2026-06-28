// Source importer: bulk-import domain/URL lists into the registry.

import { type Result, ok, err, ValidationError } from "@veritas/core";
import { type Source, type CreateSource } from "@veritas/contracts";
import { type SourceRegistry } from "./registry.js";

export interface ImportEntry {
  readonly url: string;
  readonly title?: string | null;
  readonly publisher?: string | null;
  readonly publishedAt?: string | null;
  readonly excerpt?: string | null;
}

export interface ImportResult {
  readonly imported: readonly Source[];
  readonly skipped: readonly { url: string; reason: string }[];
}

function parseEntry(raw: unknown): Result<ImportEntry> {
  if (typeof raw !== "object" || raw === null) {
    return err(new ValidationError({ message: "Import entry must be an object" }));
  }
  const obj = raw as Record<string, unknown>;
  if (typeof obj["url"] !== "string" || (obj["url"] as string).trim() === "") {
    return err(new ValidationError({ message: "Import entry missing required field: url" }));
  }
  const entry: ImportEntry = {
    url: (obj["url"] as string).trim(),
    title: typeof obj["title"] === "string" ? obj["title"] : null,
    publisher: typeof obj["publisher"] === "string" ? obj["publisher"] : null,
    publishedAt: typeof obj["publishedAt"] === "string" ? obj["publishedAt"] : null,
    excerpt: typeof obj["excerpt"] === "string" ? obj["excerpt"] : null,
  };
  return ok(entry);
}

export function createSourceImporter(registry: SourceRegistry) {
  function importEntries(raw: readonly unknown[]): ImportResult {
    const imported: Source[] = [];
    const skipped: { url: string; reason: string }[] = [];

    for (const item of raw) {
      const parsed = parseEntry(item);
      if (!parsed.ok) {
        const urlGuess =
          typeof item === "object" && item !== null
            ? String((item as Record<string, unknown>)["url"] ?? "unknown")
            : "unknown";
        skipped.push({ url: urlGuess, reason: parsed.error instanceof Error ? parsed.error.message : String(parsed.error) });
        continue;
      }
      const entry = parsed.value;
      const input: CreateSource = {
        url: entry.url,
        title: entry.title ?? null,
        publisher: entry.publisher ?? null,
        publishedAt: entry.publishedAt ?? null,
        excerpt: entry.excerpt ?? null,
      };
      const result = registry.register(input);
      if (result.ok) {
        imported.push(result.value);
      } else {
        skipped.push({ url: entry.url, reason: result.error instanceof Error ? result.error.message : String(result.error) });
      }
    }

    return { imported, skipped };
  }

  function importDomains(domains: readonly string[]): ImportResult {
    const asEntries: unknown[] = domains.map((d) => ({
      url: d.startsWith("http") ? d : `https://${d}`,
    }));
    return importEntries(asEntries);
  }

  function importJson(jsonText: string): Result<ImportResult> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      return err(new ValidationError({ message: "Invalid JSON for source import" }));
    }
    if (!Array.isArray(parsed)) {
      return err(new ValidationError({ message: "Source import JSON must be an array" }));
    }
    return ok(importEntries(parsed));
  }

  return { importEntries, importDomains, importJson };
}

export type SourceImporter = ReturnType<typeof createSourceImporter>;
