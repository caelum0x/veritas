// PubMed data source port + mock: biomedical literature search via NCBI E-utilities.

import { ok, err, type Result } from "@veritas/core";
import { MockDataSource } from "@veritas/verifier-kit";
import type { DataSourcePort, SourceDocument, SourceQuery } from "@veritas/verifier-kit";

/** PubMed-specific metadata for biomedical articles. */
export interface PubMedArticleMetadata {
  readonly pmid: string;
  readonly pmcid?: string;
  readonly meshTerms: readonly string[];
  readonly journal: string;
  readonly volume?: string;
  readonly issue?: string;
  readonly pages?: string;
  readonly isOpenAccess: boolean;
}

/** Extended port for PubMed biomedical literature queries. */
export interface PubMedDataSourcePort extends DataSourcePort {
  /** Fetch a single article by PubMed ID. */
  fetchByPmid(pmid: string): Promise<Result<SourceDocument, Error>>;
  /** Search using MeSH term vocabulary. */
  searchByMesh(meshTerm: string, maxResults?: number): Promise<Result<readonly SourceDocument[], Error>>;
}

const ESEARCH_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi";
const EFETCH_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi";
const ESUMMARY_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi";

/** Live PubMed adapter using NCBI E-utilities API. */
export class PubMedDataSource implements PubMedDataSourcePort {
  readonly sourceId = "pubmed";
  readonly displayName = "PubMed";

  private readonly apiKey: string | undefined;

  constructor(apiKey?: string) {
    this.apiKey = apiKey ?? process.env["NCBI_API_KEY"];
  }

  async search(query: SourceQuery): Promise<Result<readonly SourceDocument[], Error>> {
    try {
      const term = [
        query.keywords.join(" "),
        ...(query.after ? [`${query.after.slice(0, 4)}:${new Date().getFullYear()}[pdat]`] : []),
      ].join(" AND ");
      const searchParams = new URLSearchParams({
        db: "pubmed",
        term,
        retmax: String(query.maxResults),
        retmode: "json",
        ...(this.apiKey ? { api_key: this.apiKey } : {}),
      });
      const searchRes = await fetch(`${ESEARCH_BASE}?${searchParams}`, { signal: AbortSignal.timeout(10_000) });
      if (!searchRes.ok) return err(new Error(`PubMed esearch HTTP ${searchRes.status}`));
      const searchData: unknown = await searchRes.json();
      const pmids = extractPmids(searchData);
      if (pmids.length === 0) return ok([]);
      return this.fetchSummaries(pmids);
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  async fetch(id: string): Promise<Result<SourceDocument, Error>> {
    return this.fetchByPmid(id);
  }

  async fetchByPmid(pmid: string): Promise<Result<SourceDocument, Error>> {
    try {
      const result = await this.fetchSummaries([pmid]);
      if (!result.ok) return result as Result<SourceDocument, Error>;
      const docs = result.value;
      if (docs.length === 0) return err(new Error(`PubMed: article not found: ${pmid}`));
      return ok(docs[0]!);
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  async searchByMesh(meshTerm: string, maxResults = 10): Promise<Result<readonly SourceDocument[], Error>> {
    return this.search({ keywords: [`${meshTerm}[MeSH]`], maxResults });
  }

  private async fetchSummaries(pmids: readonly string[]): Promise<Result<readonly SourceDocument[], Error>> {
    const params = new URLSearchParams({
      db: "pubmed",
      id: pmids.join(","),
      retmode: "json",
      ...(this.apiKey ? { api_key: this.apiKey } : {}),
    });
    const res = await fetch(`${ESUMMARY_BASE}?${params}`, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return err(new Error(`PubMed esummary HTTP ${res.status}`));
    const raw: unknown = await res.json();
    return ok(parseSummaryResponse(raw));
  }
}

function extractPmids(raw: unknown): string[] {
  if (typeof raw !== "object" || raw === null) return [];
  const result = (raw as Record<string, unknown>)["esearchresult"];
  if (typeof result !== "object" || result === null) return [];
  const ids = (result as Record<string, unknown>)["idlist"];
  return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : [];
}

function parseSummaryResponse(raw: unknown): readonly SourceDocument[] {
  if (typeof raw !== "object" || raw === null) return [];
  const result = (raw as Record<string, unknown>)["result"];
  if (typeof result !== "object" || result === null) return [];
  const resultMap = result as Record<string, unknown>;
  const uids = Array.isArray(resultMap["uids"]) ? (resultMap["uids"] as string[]) : [];
  return uids.map((uid) => {
    const item = resultMap[uid];
    const src = typeof item === "object" && item !== null ? (item as Record<string, unknown>) : {};
    const meshList = Array.isArray(src["meshheadinglist"])
      ? (src["meshheadinglist"] as unknown[]).map((m) => {
          const mh = typeof m === "object" && m !== null ? (m as Record<string, unknown>) : {};
          return String(mh["name"] ?? "");
        })
      : [];
    return {
      id: uid,
      url: `https://pubmed.ncbi.nlm.nih.gov/${uid}/`,
      title: typeof src["title"] === "string" ? src["title"] : uid,
      snippet: typeof src["source"] === "string" ? src["source"] : "",
      publishedAt: typeof src["pubdate"] === "string" ? normalizePubDate(src["pubdate"]) : null,
      metadata: {
        pmid: uid,
        pmcid: typeof src["pmcid"] === "string" ? src["pmcid"] : undefined,
        meshTerms: meshList,
        journal: typeof src["fulljournalname"] === "string" ? src["fulljournalname"] : "",
        volume: typeof src["volume"] === "string" ? src["volume"] : undefined,
        issue: typeof src["issue"] === "string" ? src["issue"] : undefined,
        pages: typeof src["pages"] === "string" ? src["pages"] : undefined,
        isOpenAccess: src["openaccess"] === "1",
      } satisfies PubMedArticleMetadata,
    };
  });
}

function normalizePubDate(raw: string): string {
  const parts = raw.split(" ");
  if (parts.length >= 3) return `${parts[0]}-${monthIndex(parts[1]!)}-${parts[2]!.padStart(2, "0")}`;
  if (parts.length >= 2) return `${parts[0]}-${monthIndex(parts[1]!)}-01`;
  return `${parts[0]}-01-01`;
}

const MONTHS: Record<string, string> = {
  Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
  Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
};

function monthIndex(abbr: string): string {
  return MONTHS[abbr] ?? "01";
}

/** In-memory mock PubMed source for tests and local development. */
export class MockPubMedDataSource extends MockDataSource implements PubMedDataSourcePort {
  constructor() {
    super("pubmed", "PubMed (mock)", PUBMED_SEED);
  }

  async fetchByPmid(pmid: string): Promise<Result<SourceDocument, Error>> {
    return this.fetch(pmid);
  }

  async searchByMesh(meshTerm: string, maxResults = 10): Promise<Result<readonly SourceDocument[], Error>> {
    return this.search({ keywords: [meshTerm], maxResults });
  }
}

const PUBMED_SEED = [
  {
    id: "33587037",
    url: "https://pubmed.ncbi.nlm.nih.gov/33587037/",
    title: "Safety and Efficacy of the BNT162b2 mRNA Covid-19 Vaccine",
    snippet: "New England Journal of Medicine",
    publishedAt: "2020-12-31",
    tags: ["bnt162b2", "mrna", "covid-19", "vaccine", "safety", "efficacy", "pfizer"],
    metadata: {
      pmid: "33587037",
      meshTerms: ["COVID-19 Vaccines", "SARS-CoV-2", "BNT162 Vaccine"],
      journal: "The New England Journal of Medicine",
      volume: "383",
      issue: "27",
      pages: "2603-2615",
      isOpenAccess: false,
    } satisfies PubMedArticleMetadata,
  },
  {
    id: "17429083",
    url: "https://pubmed.ncbi.nlm.nih.gov/17429083/",
    title: "Why most published research findings are false",
    snippet: "PLOS Medicine",
    publishedAt: "2005-08-30",
    tags: ["research", "findings", "false", "statistical", "bias", "epidemiology", "ioannidis"],
    metadata: {
      pmid: "17429083",
      pmcid: "PMC1182327",
      meshTerms: ["Research Design", "Bias", "Statistics as Topic", "Publication Bias"],
      journal: "PLoS Medicine",
      volume: "2",
      issue: "8",
      pages: "e124",
      isOpenAccess: true,
    } satisfies PubMedArticleMetadata,
  },
  {
    id: "31932254",
    url: "https://pubmed.ncbi.nlm.nih.gov/31932254/",
    title: "Global cancer statistics 2020: GLOBOCAN estimates of incidence and mortality worldwide",
    snippet: "CA: A Cancer Journal for Clinicians",
    publishedAt: "2021-02-04",
    tags: ["cancer", "statistics", "incidence", "mortality", "global", "globocan"],
    metadata: {
      pmid: "31932254",
      meshTerms: ["Neoplasms", "Incidence", "Mortality", "Global Health"],
      journal: "CA: A Cancer Journal for Clinicians",
      volume: "71",
      issue: "3",
      pages: "209-249",
      isOpenAccess: true,
    } satisfies PubMedArticleMetadata,
  },
];

/** Factory that returns a live or mock PubMed source. */
export function createPubMedSource(mock = false, apiKey?: string): PubMedDataSourcePort {
  return mock ? new MockPubMedDataSource() : new PubMedDataSource(apiKey);
}
