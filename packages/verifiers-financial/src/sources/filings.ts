// Filings data source port + mock: full-text access to SEC filings and exhibits.

import { ok, err, type Result } from "@veritas/core";
import { MockDataSource } from "@veritas/verifier-kit";
import type { DataSourcePort, SourceDocument, SourceQuery } from "@veritas/verifier-kit";

/** Structured metadata for a single SEC filing. */
export interface SecFiling {
  readonly accessionNumber: string;
  readonly cik: string;
  readonly companyName: string;
  readonly formType: string;
  readonly filingDate: string;
  readonly periodOfReport: string;
  readonly url: string;
  /** Key financial statement excerpts extracted from the filing. */
  readonly financialExcerpts: Readonly<Record<string, string>>;
  /** Named exhibits (e.g. "EX-13", "EX-99.1") and their URLs. */
  readonly exhibits: Readonly<Record<string, string>>;
}

/** Filter parameters for filing searches. */
export interface FilingSearchFilter {
  readonly cik?: string;
  readonly formType?: string;
  readonly dateFrom?: string;
  readonly dateTo?: string;
  readonly fullTextQuery?: string;
}

/** Port interface for SEC filing content retrieval. */
export interface FilingsDataSourcePort extends DataSourcePort {
  /** Search filings with structured filters. */
  searchFilings(filter: FilingSearchFilter, maxResults?: number): Promise<Result<readonly SecFiling[], Error>>;
  /** Retrieve the full text of a filing by accession number. */
  fetchFilingText(accessionNumber: string): Promise<Result<string, Error>>;
  /** Retrieve structured filing metadata. */
  fetchFilingMeta(accessionNumber: string): Promise<Result<SecFiling, Error>>;
}

/** Live filings adapter wrapping the SEC EDGAR full-text search API. */
export class FilingsDataSource implements FilingsDataSourcePort {
  readonly sourceId = "filings";
  readonly displayName = "SEC Filings";

  private readonly searchBase: string;
  private readonly dataBase: string;

  constructor(
    searchBase = "https://efts.sec.gov/LATEST/search-index",
    dataBase = "https://data.sec.gov",
  ) {
    this.searchBase = searchBase;
    this.dataBase = dataBase;
  }

  async search(query: SourceQuery): Promise<Result<readonly SourceDocument[], Error>> {
    return this.searchFilings(
      { fullTextQuery: query.keywords.join(" "), dateFrom: query.after },
      query.maxResults,
    ).then((r) => {
      if (r.ok === false) return err(r.error as Error);
      return ok(r.value.map(filingToDocument));
    });
  }

  async fetch(id: string): Promise<Result<SourceDocument, Error>> {
    const meta = await this.fetchFilingMeta(id);
    if (meta.ok === false) return err(meta.error as Error);
    return ok(filingToDocument(meta.value));
  }

  async searchFilings(
    filter: FilingSearchFilter,
    maxResults = 10,
  ): Promise<Result<readonly SecFiling[], Error>> {
    try {
      const params = new URLSearchParams();
      if (filter.fullTextQuery) params.set("q", filter.fullTextQuery);
      if (filter.formType) params.set("forms", filter.formType);
      if (filter.dateFrom) params.set("dateRange", "custom"), params.set("startdt", filter.dateFrom);
      if (filter.dateTo) params.set("enddt", filter.dateTo);
      if (filter.cik) params.set("entity", filter.cik);
      params.set("hits_json", "1");

      const url = `${this.searchBase}?${params.toString()}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
      if (!res.ok) return err(new Error(`Filings search HTTP ${res.status}`));
      const raw: unknown = await res.json();
      return ok(parseFilingSearchResponse(raw, maxResults));
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  async fetchFilingText(accessionNumber: string): Promise<Result<string, Error>> {
    try {
      const cik = accessionNumber.split("-")[0] ?? "";
      const acc = accessionNumber.replace(/-/g, "");
      const url = `${this.dataBase}/Archives/edgar/data/${cik}/${acc}/${accessionNumber}-index.htm`;
      const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
      if (!res.ok) return err(new Error(`Filings text HTTP ${res.status}`));
      return ok(await res.text());
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  async fetchFilingMeta(accessionNumber: string): Promise<Result<SecFiling, Error>> {
    try {
      const cik = accessionNumber.split("-")[0] ?? "";
      const url = `${this.dataBase}/submissions/CIK${cik.padStart(10, "0")}.json`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      if (!res.ok) return err(new Error(`Filings meta HTTP ${res.status}`));
      const raw: unknown = await res.json();
      const src = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
      return ok({
        accessionNumber,
        cik,
        companyName: String(src["name"] ?? ""),
        formType: "10-K",
        filingDate: "",
        periodOfReport: "",
        url: `https://www.sec.gov/Archives/edgar/data/${cik}/${accessionNumber.replace(/-/g, "")}/`,
        financialExcerpts: {},
        exhibits: {},
      });
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }
}

function parseFilingSearchResponse(raw: unknown, maxResults: number): readonly SecFiling[] {
  if (
    typeof raw !== "object" ||
    raw === null ||
    !("hits" in raw)
  ) return [];
  const hits = (raw as Record<string, unknown>)["hits"] as Record<string, unknown>;
  const items = Array.isArray(hits["hits"]) ? (hits["hits"] as unknown[]) : [];
  return items.slice(0, maxResults).map((item): SecFiling => {
    const h = typeof item === "object" && item !== null ? (item as Record<string, unknown>) : {};
    const src = typeof h["_source"] === "object" && h["_source"] !== null
      ? (h["_source"] as Record<string, unknown>)
      : {};
    const accession = String(h["_id"] ?? "");
    const cik = String(src["entity_id"] ?? "");
    return {
      accessionNumber: accession,
      cik,
      companyName: String(src["display_names"] ?? ""),
      formType: String(src["form_type"] ?? ""),
      filingDate: String(src["file_date"] ?? ""),
      periodOfReport: String(src["period_of_report"] ?? ""),
      url: `https://www.sec.gov/Archives/edgar/data/${cik}/${accession.replace(/-/g, "")}/`,
      financialExcerpts: {},
      exhibits: {},
    };
  });
}

function filingToDocument(f: SecFiling): SourceDocument {
  return {
    id: f.accessionNumber,
    url: f.url,
    title: `${f.companyName} ${f.formType} (${f.filingDate})`,
    snippet: `Filing: ${f.formType}, Period: ${f.periodOfReport}, CIK: ${f.cik}.`,
    publishedAt: f.filingDate || null,
    metadata: {
      accessionNumber: f.accessionNumber,
      cik: f.cik,
      companyName: f.companyName,
      formType: f.formType,
      periodOfReport: f.periodOfReport,
    },
  };
}

/** In-memory mock filings source for tests and local development. */
export class MockFilingsDataSource extends MockDataSource implements FilingsDataSourcePort {
  private readonly filings: ReadonlyMap<string, SecFiling>;

  constructor() {
    super("filings", "SEC Filings (mock)", FILING_SEED.map((f) => ({
      id: f.accessionNumber,
      url: f.url,
      title: `${f.companyName} ${f.formType} (${f.filingDate})`,
      snippet: `Revenue excerpt from ${f.formType}.`,
      publishedAt: f.filingDate,
      tags: [f.companyName.toLowerCase(), f.formType.toLowerCase(), f.cik, f.periodOfReport.slice(0, 4)],
      metadata: { ...f } as Readonly<Record<string, unknown>>,
    })));
    this.filings = new Map(FILING_SEED.map((f) => [f.accessionNumber, f]));
  }

  async searchFilings(filter: FilingSearchFilter, maxResults = 10): Promise<Result<readonly SecFiling[], Error>> {
    const all = [...this.filings.values()].filter((f) => {
      if (filter.cik && f.cik !== filter.cik) return false;
      if (filter.formType && f.formType !== filter.formType) return false;
      if (filter.dateFrom && f.filingDate < filter.dateFrom) return false;
      if (filter.dateTo && f.filingDate > filter.dateTo) return false;
      if (filter.fullTextQuery) {
        const q = filter.fullTextQuery.toLowerCase();
        return f.companyName.toLowerCase().includes(q) || f.formType.toLowerCase().includes(q);
      }
      return true;
    }).slice(0, maxResults);
    return ok(all);
  }

  async fetchFilingText(accessionNumber: string): Promise<Result<string, Error>> {
    const f = this.filings.get(accessionNumber);
    if (!f) return err(new Error(`MockFilings: accession not found: ${accessionNumber}`));
    const excerpts = Object.entries(f.financialExcerpts)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");
    return ok(`${f.companyName} ${f.formType} for period ending ${f.periodOfReport}\n\n${excerpts}`);
  }

  async fetchFilingMeta(accessionNumber: string): Promise<Result<SecFiling, Error>> {
    const f = this.filings.get(accessionNumber);
    if (!f) return err(new Error(`MockFilings: accession not found: ${accessionNumber}`));
    return ok(f);
  }
}

const FILING_SEED: readonly SecFiling[] = [
  {
    accessionNumber: "0000320193-23-000106",
    cik: "320193",
    companyName: "Apple Inc.",
    formType: "10-K",
    filingDate: "2023-11-03",
    periodOfReport: "2023-09-30",
    url: "https://www.sec.gov/Archives/edgar/data/320193/000032019323000106/",
    financialExcerpts: {
      revenue: "Net sales totaled $383.3 billion for fiscal 2023, a decrease of 3% from fiscal 2022.",
      netIncome: "Net income was $97.0 billion for fiscal 2023, a decrease of 3% from fiscal 2022.",
      grossMargin: "Gross margin was 44.1% for fiscal 2023.",
    },
    exhibits: { "EX-21.1": "https://www.sec.gov/Archives/edgar/data/320193/000032019323000106/aapl-ex211.htm" },
  },
  {
    accessionNumber: "0001318605-24-000010",
    cik: "1318605",
    companyName: "Tesla Inc.",
    formType: "10-K",
    filingDate: "2024-01-26",
    periodOfReport: "2023-12-31",
    url: "https://www.sec.gov/Archives/edgar/data/1318605/000131860524000010/",
    financialExcerpts: {
      revenue: "Total revenues were $96.8 billion for the year ended December 31, 2023.",
      netIncome: "Net income attributable to common stockholders was $15.0 billion for fiscal 2023.",
      grossMargin: "Automotive gross margin was 18.2% in fiscal 2023.",
    },
    exhibits: {},
  },
  {
    accessionNumber: "0001652044-24-000022",
    cik: "1652044",
    companyName: "Alphabet Inc.",
    formType: "10-K",
    filingDate: "2024-01-30",
    periodOfReport: "2023-12-31",
    url: "https://www.sec.gov/Archives/edgar/data/1652044/000165204424000022/",
    financialExcerpts: {
      revenue: "Revenues were $307.4 billion for fiscal year 2023, an increase of 9% year over year.",
      advertisingRevenue: "Google advertising revenues totaled $237.9 billion in fiscal year 2023.",
      netIncome: "Net income was $73.8 billion for fiscal year 2023.",
    },
    exhibits: {},
  },
];

/** Factory that returns a mock or live filings source. */
export function createFilingsSource(mock = false): FilingsDataSourcePort {
  return mock ? new MockFilingsDataSource() : new FilingsDataSource();
}
