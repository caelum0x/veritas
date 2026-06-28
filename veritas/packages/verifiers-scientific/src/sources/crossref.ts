// Crossref data source port + mock: scholarly article metadata and citation lookup.

import { ok, err, type Result } from "@veritas/core";
import { MockDataSource } from "@veritas/verifier-kit";
import type { DataSourcePort, SourceDocument, SourceQuery } from "@veritas/verifier-kit";

/** Crossref-specific metadata for scholarly articles. */
export interface CrossrefArticleMetadata {
  readonly doi: string;
  readonly type: string;
  readonly publisherName: string;
  readonly citedByCount: number;
  readonly isOpenAccess: boolean;
  readonly issn?: readonly string[];
}

/** Extended port for Crossref scholarly metadata queries. */
export interface CrossrefDataSourcePort extends DataSourcePort {
  /** Fetch article metadata by DOI. */
  fetchByDoi(doi: string): Promise<Result<SourceDocument, Error>>;
  /** Search articles by author name. */
  searchByAuthor(author: string, maxResults?: number): Promise<Result<readonly SourceDocument[], Error>>;
}

/** Live Crossref adapter using the public REST API. */
export class CrossrefDataSource implements CrossrefDataSourcePort {
  readonly sourceId = "crossref";
  readonly displayName = "Crossref";

  private readonly baseUrl: string;

  constructor(baseUrl = "https://api.crossref.org") {
    this.baseUrl = baseUrl;
  }

  async search(query: SourceQuery): Promise<Result<readonly SourceDocument[], Error>> {
    try {
      const params = new URLSearchParams({
        query: query.keywords.join(" "),
        rows: String(query.maxResults),
        ...(query.after ? { "filter": `from-pub-date:${query.after.slice(0, 10)}` } : {}),
      });
      const url = `${this.baseUrl}/works?${params.toString()}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      if (!res.ok) return err(new Error(`Crossref search HTTP ${res.status}`));
      const raw: unknown = await res.json();
      return ok(parseCrossrefSearchResponse(raw, query.maxResults));
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  async fetch(id: string): Promise<Result<SourceDocument, Error>> {
    return this.fetchByDoi(id);
  }

  async fetchByDoi(doi: string): Promise<Result<SourceDocument, Error>> {
    try {
      const url = `${this.baseUrl}/works/${encodeURIComponent(doi)}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      if (!res.ok) return err(new Error(`Crossref fetch HTTP ${res.status}`));
      const raw: unknown = await res.json();
      return ok(parseCrossrefWork(raw));
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  async searchByAuthor(author: string, maxResults = 10): Promise<Result<readonly SourceDocument[], Error>> {
    return this.search({ keywords: [`author:${author}`], maxResults });
  }
}

function parseCrossrefSearchResponse(raw: unknown, maxResults: number): readonly SourceDocument[] {
  if (typeof raw !== "object" || raw === null) return [];
  const message = (raw as Record<string, unknown>)["message"];
  if (typeof message !== "object" || message === null) return [];
  const items = (message as Record<string, unknown>)["items"];
  if (!Array.isArray(items)) return [];
  return items.slice(0, maxResults).map((item, i) => parseCrossrefWorkItem(item, i));
}

function parseCrossrefWork(raw: unknown): SourceDocument {
  if (typeof raw !== "object" || raw === null) return fallbackDoc("unknown");
  const message = (raw as Record<string, unknown>)["message"];
  return parseCrossrefWorkItem(message ?? raw, 0);
}

function parseCrossrefWorkItem(item: unknown, index: number): SourceDocument {
  const src = typeof item === "object" && item !== null ? (item as Record<string, unknown>) : {};
  const doi = typeof src["DOI"] === "string" ? src["DOI"] : `crossref-${index}`;
  const titles = Array.isArray(src["title"]) ? src["title"] : [];
  const title = typeof titles[0] === "string" ? titles[0] : doi;
  const authors = Array.isArray(src["author"])
    ? (src["author"] as unknown[])
        .slice(0, 3)
        .map((a) => {
          const auth = typeof a === "object" && a !== null ? (a as Record<string, unknown>) : {};
          return [auth["given"], auth["family"]].filter(Boolean).join(" ");
        })
        .join(", ")
    : "";
  const published = src["published"] ?? src["published-print"] ?? src["published-online"];
  const dateParts =
    typeof published === "object" && published !== null
      ? ((published as Record<string, unknown>)["date-parts"] as unknown[] | undefined)
      : undefined;
  const datePart = Array.isArray(dateParts) && Array.isArray(dateParts[0]) ? (dateParts[0] as number[]) : null;
  const publishedAt = datePart && datePart[0]
    ? `${datePart[0]}-${String(datePart[1] ?? 1).padStart(2, "0")}-${String(datePart[2] ?? 1).padStart(2, "0")}`
    : null;
  return {
    id: doi,
    url: `https://doi.org/${doi}`,
    title,
    snippet: authors ? `Authors: ${authors}` : "",
    publishedAt,
    metadata: {
      doi,
      type: typeof src["type"] === "string" ? src["type"] : "journal-article",
      publisherName: typeof src["publisher"] === "string" ? src["publisher"] : "",
      citedByCount: typeof src["is-referenced-by-count"] === "number" ? src["is-referenced-by-count"] : 0,
      isOpenAccess: src["license"] !== undefined,
      issn: Array.isArray(src["ISSN"]) ? (src["ISSN"] as string[]) : undefined,
    } satisfies CrossrefArticleMetadata,
  };
}

function fallbackDoc(id: string): SourceDocument {
  return { id, url: `https://doi.org/${id}`, title: id, snippet: "", publishedAt: null, metadata: {} };
}

/** In-memory mock Crossref source for tests and local development. */
export class MockCrossrefDataSource extends MockDataSource implements CrossrefDataSourcePort {
  constructor() {
    super("crossref", "Crossref (mock)", CROSSREF_SEED);
  }

  async fetchByDoi(doi: string): Promise<Result<SourceDocument, Error>> {
    return this.fetch(doi);
  }

  async searchByAuthor(author: string, maxResults = 10): Promise<Result<readonly SourceDocument[], Error>> {
    return this.search({ keywords: [author], maxResults });
  }
}

const CROSSREF_SEED = [
  {
    id: "10.1038/nature12345",
    url: "https://doi.org/10.1038/nature12345",
    title: "Climate sensitivity estimated from temperature reconstructions of the Last Glacial Maximum",
    snippet: "Authors: Schmittner, A., Urban, N.M., Shakun, J.D.",
    publishedAt: "2011-12-09",
    tags: ["climate", "sensitivity", "glacial", "temperature", "reconstruction", "nature"],
    metadata: {
      doi: "10.1038/nature12345",
      type: "journal-article",
      publisherName: "Nature Publishing Group",
      citedByCount: 2847,
      isOpenAccess: false,
    } satisfies CrossrefArticleMetadata,
  },
  {
    id: "10.1126/science.1232005",
    url: "https://doi.org/10.1126/science.1232005",
    title: "Estimating the reproducibility of psychological science",
    snippet: "Authors: Open Science Collaboration",
    publishedAt: "2015-08-28",
    tags: ["reproducibility", "psychology", "replication", "science", "experiment"],
    metadata: {
      doi: "10.1126/science.1232005",
      type: "journal-article",
      publisherName: "American Association for the Advancement of Science",
      citedByCount: 5621,
      isOpenAccess: true,
    } satisfies CrossrefArticleMetadata,
  },
  {
    id: "10.1016/j.cell.2020.04.031",
    url: "https://doi.org/10.1016/j.cell.2020.04.031",
    title: "SARS-CoV-2 Cell Entry Depends on ACE2 and TMPRSS2 and Is Blocked by a Clinically Proven Protease Inhibitor",
    snippet: "Authors: Hoffmann, M., Kleine-Weber, H., Schroeder, S.",
    publishedAt: "2020-04-16",
    tags: ["sars-cov-2", "covid", "ace2", "tmprss2", "cell entry", "virus"],
    metadata: {
      doi: "10.1016/j.cell.2020.04.031",
      type: "journal-article",
      publisherName: "Elsevier",
      citedByCount: 8934,
      isOpenAccess: false,
    } satisfies CrossrefArticleMetadata,
  },
];

/** Factory that returns a live or mock Crossref source. */
export function createCrossrefSource(mock = false): CrossrefDataSourcePort {
  return mock ? new MockCrossrefDataSource() : new CrossrefDataSource();
}
