// Retraction data source port + mock: check papers against the Retraction Watch database.

import { ok, err, isErr, type Result } from "@veritas/core";
import { MockDataSource } from "@veritas/verifier-kit";
import type { DataSourcePort, SourceDocument, SourceQuery } from "@veritas/verifier-kit";

/** Retraction record metadata. */
export interface RetractionMetadata {
  readonly doi: string;
  readonly pmid?: string;
  readonly retractionDoi?: string;
  readonly retractionDate: string;
  readonly reasons: readonly string[];
  readonly journal: string;
  readonly paywalled: boolean;
}

/** Extended port for Retraction Watch queries. */
export interface RetractionDataSourcePort extends DataSourcePort {
  /** Check whether a specific DOI has been retracted. */
  checkDoi(doi: string): Promise<Result<SourceDocument | null, Error>>;
  /** Check whether a PubMed ID has been retracted. */
  checkPmid(pmid: string): Promise<Result<SourceDocument | null, Error>>;
}

const RETRACTION_API_BASE = "https://api.retractionwatch.com";

/** Live Retraction Watch adapter. */
export class RetractionDataSource implements RetractionDataSourcePort {
  readonly sourceId = "retraction-watch";
  readonly displayName = "Retraction Watch";

  private readonly apiKey: string | undefined;

  constructor(apiKey?: string) {
    this.apiKey = apiKey ?? process.env["RETRACTION_WATCH_API_KEY"];
  }

  async search(query: SourceQuery): Promise<Result<readonly SourceDocument[], Error>> {
    try {
      const params = new URLSearchParams({
        query: query.keywords.join(" "),
        limit: String(query.maxResults),
        ...(this.apiKey ? { apiKey: this.apiKey } : {}),
      });
      const url = `${RETRACTION_API_BASE}/api/records?${params}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      if (!res.ok) return err(new Error(`Retraction Watch search HTTP ${res.status}`));
      const raw: unknown = await res.json();
      return ok(parseRetractionSearchResponse(raw, query.maxResults));
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  async fetch(id: string): Promise<Result<SourceDocument, Error>> {
    const result = await this.checkDoi(id);
    if (!result.ok) return result as Result<SourceDocument, Error>;
    if (result.value === null) return err(new Error(`Retraction Watch: no record for ${id}`));
    return ok(result.value);
  }

  async checkDoi(doi: string): Promise<Result<SourceDocument | null, Error>> {
    try {
      const params = new URLSearchParams({
        doi: doi.toLowerCase(),
        ...(this.apiKey ? { apiKey: this.apiKey } : {}),
      });
      const url = `${RETRACTION_API_BASE}/api/records?${params}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      if (!res.ok) return err(new Error(`Retraction Watch checkDoi HTTP ${res.status}`));
      const raw: unknown = await res.json();
      const docs = parseRetractionSearchResponse(raw, 1);
      return ok(docs[0] ?? null);
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  async checkPmid(pmid: string): Promise<Result<SourceDocument | null, Error>> {
    try {
      const params = new URLSearchParams({
        pmid,
        ...(this.apiKey ? { apiKey: this.apiKey } : {}),
      });
      const url = `${RETRACTION_API_BASE}/api/records?${params}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      if (!res.ok) return err(new Error(`Retraction Watch checkPmid HTTP ${res.status}`));
      const raw: unknown = await res.json();
      const docs = parseRetractionSearchResponse(raw, 1);
      return ok(docs[0] ?? null);
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }
}

function parseRetractionSearchResponse(raw: unknown, maxResults: number): readonly SourceDocument[] {
  const items = Array.isArray(raw) ? raw : [];
  return items.slice(0, maxResults).map((item, i) => parseRetractionRecord(item, i));
}

function parseRetractionRecord(item: unknown, index: number): SourceDocument {
  const src = typeof item === "object" && item !== null ? (item as Record<string, unknown>) : {};
  const doi = typeof src["OriginalPaperDOI"] === "string" ? src["OriginalPaperDOI"] : `retraction-${index}`;
  const reasons = typeof src["Reason"] === "string"
    ? src["Reason"].split(";").map((r) => r.trim()).filter(Boolean)
    : [];
  return {
    id: doi,
    url: `https://retractionwatch.com/?s=${encodeURIComponent(doi)}`,
    title: typeof src["Title"] === "string" ? src["Title"] : doi,
    snippet: reasons.join("; "),
    publishedAt: typeof src["RetractionDate"] === "string" ? normalizeDate(src["RetractionDate"]) : null,
    metadata: {
      doi,
      pmid: typeof src["OriginalPaperPubMedID"] === "string" ? src["OriginalPaperPubMedID"] : undefined,
      retractionDoi: typeof src["RetractionDOI"] === "string" ? src["RetractionDOI"] : undefined,
      retractionDate: typeof src["RetractionDate"] === "string" ? src["RetractionDate"] : "",
      reasons,
      journal: typeof src["Journal"] === "string" ? src["Journal"] : "",
      paywalled: src["Paywalled"] === "Yes",
    } satisfies RetractionMetadata,
  };
}

function normalizeDate(raw: string): string {
  const match = /(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(raw);
  if (match) {
    const [, mm, dd, yyyy] = match;
    return `${yyyy}-${mm!.padStart(2, "0")}-${dd!.padStart(2, "0")}`;
  }
  return raw;
}

/** In-memory mock Retraction Watch source for tests and local development. */
export class MockRetractionDataSource extends MockDataSource implements RetractionDataSourcePort {
  constructor() {
    super("retraction-watch", "Retraction Watch (mock)", RETRACTION_SEED);
  }

  async checkDoi(doi: string): Promise<Result<SourceDocument | null, Error>> {
    const result = await this.fetch(doi);
    if (result.ok) return ok(result.value);
    return ok(null);
  }

  async checkPmid(pmid: string): Promise<Result<SourceDocument | null, Error>> {
    const result = await this.search({ keywords: [pmid], maxResults: 1 });
    if (isErr(result)) return result;
    return ok(result.value[0] ?? null);
  }
}

const RETRACTION_SEED = [
  {
    id: "10.1016/S0140-6736(97)11096-0",
    url: "https://retractionwatch.com/?s=10.1016%2FS0140-6736%2897%2911096-0",
    title: "Ileal-lymphoid-nodular hyperplasia, non-specific colitis, and pervasive developmental disorder in children",
    snippet: "Fraud; Ethical violations; Data falsification",
    publishedAt: "2010-02-02",
    tags: ["wakefield", "mmr", "vaccine", "autism", "retraction", "fraud", "lancet", "10.1016/S0140-6736(97)11096-0"],
    metadata: {
      doi: "10.1016/S0140-6736(97)11096-0",
      pmid: "9500320",
      retractionDoi: "10.1016/S0140-6736(10)60175-4",
      retractionDate: "02/02/2010",
      reasons: ["Fraud", "Ethical violations", "Data falsification"],
      journal: "The Lancet",
      paywalled: false,
    } satisfies RetractionMetadata,
  },
  {
    id: "10.1126/science.1255484",
    url: "https://retractionwatch.com/?s=10.1126%2Fscience.1255484",
    title: "When contact changes minds: An experiment on transmission of support for gay equality",
    snippet: "Data fabrication; Results not reproducible",
    publishedAt: "2015-05-28",
    tags: ["lacour", "gay", "marriage", "survey", "retraction", "fabrication", "science"],
    metadata: {
      doi: "10.1126/science.1255484",
      retractionDate: "05/28/2015",
      reasons: ["Data fabrication", "Results not reproducible"],
      journal: "Science",
      paywalled: false,
    } satisfies RetractionMetadata,
  },
];

/** Factory that returns a live or mock Retraction Watch source. */
export function createRetractionSource(mock = false, apiKey?: string): RetractionDataSourcePort {
  return mock ? new MockRetractionDataSource() : new RetractionDataSource(apiKey);
}
