// Mock DataSourcePort implementation for testing and local development.

import { ok, err } from "@veritas/core";
import { type DataSourcePort, type SourceDocument, type SourceQuery } from "./source-port.js";

/** Seed entry used to pre-populate the mock source. */
export interface MockSourceEntry {
  readonly id: string;
  readonly url: string;
  readonly title: string;
  readonly snippet: string;
  readonly publishedAt: string | null;
  readonly metadata?: Readonly<Record<string, unknown>>;
  /** Keywords this entry should match during search. */
  readonly tags: readonly string[];
}

/** In-memory DataSourcePort for tests and offline development. */
export class MockDataSource implements DataSourcePort {
  readonly sourceId: string;
  readonly displayName: string;

  private readonly entries: ReadonlyMap<string, MockSourceEntry>;

  constructor(
    sourceId: string,
    displayName: string,
    seed: readonly MockSourceEntry[] = []
  ) {
    this.sourceId = sourceId;
    this.displayName = displayName;
    this.entries = new Map(seed.map((e) => [e.id, e]));
  }

  async search(query: SourceQuery) {
    const lower = query.keywords.map((k) => k.toLowerCase());

    const matches = [...this.entries.values()]
      .filter((entry) => {
        const entryTags = entry.tags.map((t) => t.toLowerCase());
        return lower.some((kw) => entryTags.some((t) => t.includes(kw)));
      })
      .filter((entry) => {
        if (query.after && entry.publishedAt) {
          return entry.publishedAt >= query.after;
        }
        return true;
      })
      .filter((entry) => {
        if (query.domain) {
          try {
            return new URL(entry.url).hostname.includes(query.domain);
          } catch {
            return false;
          }
        }
        return true;
      })
      .slice(0, query.maxResults)
      .map((entry): SourceDocument => ({
        id: entry.id,
        url: entry.url,
        title: entry.title,
        snippet: entry.snippet,
        publishedAt: entry.publishedAt,
        metadata: entry.metadata ?? {},
      }));

    return ok(matches as readonly SourceDocument[]);
  }

  async fetch(id: string) {
    const entry = this.entries.get(id);
    if (!entry) {
      return err(new Error(`MockDataSource(${this.sourceId}): document not found: ${id}`));
    }
    const doc: SourceDocument = {
      id: entry.id,
      url: entry.url,
      title: entry.title,
      snippet: entry.snippet,
      publishedAt: entry.publishedAt,
      metadata: entry.metadata ?? {},
    };
    return ok(doc);
  }
}

/** Build a MockDataSource with a given seed; convenience factory. */
export function createMockSource(
  sourceId: string,
  displayName: string,
  seed: readonly MockSourceEntry[] = []
): DataSourcePort {
  return new MockDataSource(sourceId, displayName, seed);
}
