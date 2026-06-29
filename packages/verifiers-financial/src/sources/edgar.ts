// EDGAR data source port + mock: SEC filings search and retrieval.

import { ok, err, type Result } from "@veritas/core";
import { MockDataSource } from "@veritas/verifier-kit";
import type { DataSourcePort, SourceDocument, SourceQuery } from "@veritas/verifier-kit";

/** EDGAR-specific metadata attached to SEC filing documents. */
export interface EdgarFilingMetadata {
  readonly cik: string;
  readonly formType: string;
  readonly filingDate: string;
  readonly accessionNumber: string;
  readonly companyName: string;
  readonly fiscalYearEnd?: string;
}

/** Port interface for EDGAR SEC filing queries. */
export interface EdgarDataSourcePort extends DataSourcePort {
  /** Look up filings by CIK (Central Index Key). */
  fetchByCik(cik: string, formType?: string): Promise<Result<readonly SourceDocument[], Error>>;
  /** Search filings by company ticker symbol. */
  searchByTicker(ticker: string, formType?: string): Promise<Result<readonly SourceDocument[], Error>>;
}

/** Live EDGAR adapter — wraps the public EDGAR full-text search API. */
export class EdgarDataSource implements EdgarDataSourcePort {
  readonly sourceId = "edgar";
  readonly displayName = "SEC EDGAR";

  private readonly baseUrl: string;

  constructor(baseUrl = "https://efts.sec.gov/LATEST/search-index") {
    this.baseUrl = baseUrl;
  }

  async search(query: SourceQuery): Promise<Result<readonly SourceDocument[], Error>> {
    try {
      const params = new URLSearchParams({
        q: query.keywords.join(" "),
        dateRange: query.after ? "custom" : "",
        startdt: query.after ?? "",
        hits_json: "1",
      });
      const url = `${this.baseUrl}?${params.toString()}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      if (!res.ok) return err(new Error(`EDGAR search HTTP ${res.status}`));
      const raw: unknown = await res.json();
      return ok(parseEdgarSearchResponse(raw, query.maxResults));
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  async fetch(id: string): Promise<Result<SourceDocument, Error>> {
    try {
      const url = `https://data.sec.gov/submissions/${id}.json`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      if (!res.ok) return err(new Error(`EDGAR fetch HTTP ${res.status}`));
      const raw: unknown = await res.json();
      return ok(parseEdgarDocument(id, raw));
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  async fetchByCik(cik: string, formType?: string): Promise<Result<readonly SourceDocument[], Error>> {
    const keywords = [cik, ...(formType ? [formType] : [])];
    return this.search({ keywords, maxResults: 10 });
  }

  async searchByTicker(ticker: string, formType?: string): Promise<Result<readonly SourceDocument[], Error>> {
    const keywords = [ticker, ...(formType ? [formType] : [])];
    return this.search({ keywords, maxResults: 10 });
  }
}

function parseEdgarSearchResponse(raw: unknown, maxResults: number): readonly SourceDocument[] {
  if (
    typeof raw !== "object" ||
    raw === null ||
    !("hits" in raw) ||
    typeof (raw as Record<string, unknown>)["hits"] !== "object"
  ) {
    return [];
  }
  const hits = (raw as Record<string, unknown>)["hits"] as Record<string, unknown>;
  const items = Array.isArray(hits["hits"]) ? (hits["hits"] as unknown[]) : [];
  return items.slice(0, maxResults).map((item, i): SourceDocument => {
    const src = typeof item === "object" && item !== null ? (item as Record<string, unknown>) : {};
    const source = typeof src["_source"] === "object" && src["_source"] !== null
      ? (src["_source"] as Record<string, unknown>)
      : {};
    const accession = typeof src["_id"] === "string" ? src["_id"] : `edgar-${i}`;
    return {
      id: accession,
      url: `https://www.sec.gov/Archives/edgar/data/${String(source["entity_id"] ?? "0")}/${accession}`,
      title: String(source["display_names"] ?? source["form_type"] ?? "SEC Filing"),
      snippet: String(source["file_date"] ?? ""),
      publishedAt: typeof source["file_date"] === "string" ? source["file_date"] : null,
      metadata: {
        formType: source["form_type"],
        companyName: source["display_names"],
        accessionNumber: accession,
      },
    };
  });
}

function parseEdgarDocument(id: string, raw: unknown): SourceDocument {
  const src = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  return {
    id,
    url: `https://data.sec.gov/submissions/${id}.json`,
    title: String(src["name"] ?? id),
    snippet: String(src["description"] ?? ""),
    publishedAt: typeof src["filedAt"] === "string" ? src["filedAt"] : null,
    metadata: { cik: src["cik"], sic: src["sic"], tickers: src["tickers"] },
  };
}

/** In-memory mock EDGAR source for tests and local development. */
export class MockEdgarDataSource extends MockDataSource implements EdgarDataSourcePort {
  constructor() {
    super("edgar", "SEC EDGAR (mock)", EDGAR_SEED);
  }

  async fetchByCik(cik: string, formType?: string): Promise<Result<readonly SourceDocument[], Error>> {
    const keywords = [cik, ...(formType ? [formType] : [])];
    return this.search({ keywords, maxResults: 10 });
  }

  async searchByTicker(ticker: string, formType?: string): Promise<Result<readonly SourceDocument[], Error>> {
    const keywords = [ticker, ...(formType ? [formType] : [])];
    return this.search({ keywords, maxResults: 10 });
  }
}

const EDGAR_SEED = [
  {
    id: "0000320193-23-000106",
    url: "https://www.sec.gov/Archives/edgar/data/320193/000032019323000106/",
    title: "Apple Inc. 10-K Annual Report 2023",
    snippet: "Apple Inc. annual revenue $383.3B, net income $97.0B for fiscal year 2023.",
    publishedAt: "2023-11-03",
    tags: ["aapl", "apple", "10-k", "annual", "revenue", "income", "320193"],
    metadata: { cik: "320193", formType: "10-K", filingDate: "2023-11-03", companyName: "Apple Inc.", accessionNumber: "0000320193-23-000106" } satisfies EdgarFilingMetadata,
  },
  {
    id: "0001318605-24-000010",
    url: "https://www.sec.gov/Archives/edgar/data/1318605/000131860524000010/",
    title: "Tesla Inc. 10-K Annual Report 2023",
    snippet: "Tesla Inc. total revenue $96.8B, gross margin 18.2% for fiscal year 2023.",
    publishedAt: "2024-01-26",
    tags: ["tsla", "tesla", "10-k", "annual", "revenue", "1318605"],
    metadata: { cik: "1318605", formType: "10-K", filingDate: "2024-01-26", companyName: "Tesla Inc.", accessionNumber: "0001318605-24-000010" } satisfies EdgarFilingMetadata,
  },
  {
    id: "0001652044-24-000022",
    url: "https://www.sec.gov/Archives/edgar/data/1652044/000165204424000022/",
    title: "Alphabet Inc. 10-K Annual Report 2023",
    snippet: "Alphabet Inc. annual revenue $307.4B, advertising revenue $237.9B for fiscal year 2023.",
    publishedAt: "2024-01-30",
    tags: ["googl", "goog", "alphabet", "google", "10-k", "annual", "1652044"],
    metadata: { cik: "1652044", formType: "10-K", filingDate: "2024-01-30", companyName: "Alphabet Inc.", accessionNumber: "0001652044-24-000022" } satisfies EdgarFilingMetadata,
  },
];

/** Factory that returns a mock EDGAR source for offline use. */
export function createEdgarSource(mock = false): EdgarDataSourcePort {
  return mock ? new MockEdgarDataSource() : new EdgarDataSource();
}
