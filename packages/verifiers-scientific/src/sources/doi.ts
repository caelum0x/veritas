// DOI data source port + mock: resolve Digital Object Identifiers to canonical metadata.

import { ok, err, type Result } from "@veritas/core";
import { MockDataSource } from "@veritas/verifier-kit";
import type { DataSourcePort, SourceDocument, SourceQuery } from "@veritas/verifier-kit";

/** Metadata returned from DOI resolution. */
export interface DoiMetadata {
  readonly doi: string;
  readonly registrationAgency: string;
  readonly resourceType: string;
  readonly resolvedUrl: string;
}

/** Extended port for DOI resolution and content-negotiation queries. */
export interface DoiDataSourcePort extends DataSourcePort {
  /** Resolve a DOI to its canonical metadata via content negotiation. */
  resolveDoi(doi: string): Promise<Result<SourceDocument, Error>>;
  /** Batch-resolve multiple DOIs; failures are skipped silently. */
  resolveBatch(dois: readonly string[]): Promise<Result<readonly SourceDocument[], Error>>;
}

const DOI_RESOLVER_BASE = "https://doi.org";
const DOI_RA_BASE = "https://doi.org/doiRA";

/** Live DOI adapter using the doi.org content-negotiation API. */
export class DoiDataSource implements DoiDataSourcePort {
  readonly sourceId = "doi";
  readonly displayName = "DOI Resolver";

  async search(query: SourceQuery): Promise<Result<readonly SourceDocument[], Error>> {
    const dois = query.keywords.filter((kw) => /^10\.\d{4,}\//.test(kw));
    if (dois.length === 0) return ok([]);
    return this.resolveBatch(dois.slice(0, query.maxResults));
  }

  async fetch(id: string): Promise<Result<SourceDocument, Error>> {
    return this.resolveDoi(id);
  }

  async resolveDoi(doi: string): Promise<Result<SourceDocument, Error>> {
    try {
      const url = `${DOI_RESOLVER_BASE}/${encodeURIComponent(doi)}`;
      const res = await fetch(url, {
        headers: { Accept: "application/vnd.citationstyles.csl+json" },
        signal: AbortSignal.timeout(10_000),
        redirect: "follow",
      });
      if (!res.ok) return err(new Error(`DOI resolve HTTP ${res.status} for ${doi}`));
      const raw: unknown = await res.json();
      return ok(parseDoiCslJson(doi, raw, url));
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  async resolveBatch(dois: readonly string[]): Promise<Result<readonly SourceDocument[], Error>> {
    const results = await Promise.allSettled(dois.map((doi) => this.resolveDoi(doi)));
    const docs: SourceDocument[] = [];
    for (const r of results) {
      if (r.status === "fulfilled" && r.value.ok) {
        docs.push(r.value.value);
      }
    }
    return ok(docs);
  }
}

function parseDoiCslJson(doi: string, raw: unknown, resolvedUrl: string): SourceDocument {
  const src = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  const title = Array.isArray(src["title"]) ? String(src["title"][0] ?? doi) : String(src["title"] ?? doi);
  const authors = Array.isArray(src["author"])
    ? (src["author"] as unknown[])
        .slice(0, 3)
        .map((a) => {
          const auth = typeof a === "object" && a !== null ? (a as Record<string, unknown>) : {};
          return [auth["given"], auth["family"]].filter(Boolean).join(" ");
        })
        .join(", ")
    : "";
  const issued = src["issued"];
  let publishedAt: string | null = null;
  if (typeof issued === "object" && issued !== null) {
    const parts = (issued as Record<string, unknown>)["date-parts"];
    if (Array.isArray(parts) && Array.isArray(parts[0])) {
      const dp = parts[0] as number[];
      publishedAt = [dp[0], String(dp[1] ?? 1).padStart(2, "0"), String(dp[2] ?? 1).padStart(2, "0")].join("-");
    }
  }
  return {
    id: doi,
    url: resolvedUrl,
    title,
    snippet: authors ? `Authors: ${authors}` : "",
    publishedAt,
    metadata: {
      doi,
      registrationAgency: typeof src["publisher"] === "string" ? src["publisher"] : "Crossref",
      resourceType: typeof src["type"] === "string" ? src["type"] : "unknown",
      resolvedUrl,
    } satisfies DoiMetadata,
  };
}

/** In-memory mock DOI source for tests and local development. */
export class MockDoiDataSource extends MockDataSource implements DoiDataSourcePort {
  constructor() {
    super("doi", "DOI Resolver (mock)", DOI_SEED);
  }

  async resolveDoi(doi: string): Promise<Result<SourceDocument, Error>> {
    return this.fetch(doi);
  }

  async resolveBatch(dois: readonly string[]): Promise<Result<readonly SourceDocument[], Error>> {
    const results = await Promise.allSettled(dois.map((doi) => this.fetch(doi)));
    const docs: SourceDocument[] = [];
    for (const r of results) {
      if (r.status === "fulfilled" && r.value.ok) docs.push(r.value.value);
    }
    return ok(docs);
  }
}

const DOI_SEED = [
  {
    id: "10.1038/s41586-021-03819-2",
    url: "https://doi.org/10.1038/s41586-021-03819-2",
    title: "Highly accurate protein structure prediction with AlphaFold",
    snippet: "Authors: Jumper, J., Evans, R., Pritzel, A.",
    publishedAt: "2021-07-15",
    tags: ["alphafold", "protein", "structure", "prediction", "deepmind", "nature"],
    metadata: {
      doi: "10.1038/s41586-021-03819-2",
      registrationAgency: "Nature Publishing Group",
      resourceType: "journal-article",
      resolvedUrl: "https://www.nature.com/articles/s41586-021-03819-2",
    } satisfies DoiMetadata,
  },
  {
    id: "10.1145/3442188.3445922",
    url: "https://doi.org/10.1145/3442188.3445922",
    title: "On the Dangers of Stochastic Parrots: Can Language Models Be Too Big?",
    snippet: "Authors: Bender, E.M., Gebru, T., McMillan-Major, A.",
    publishedAt: "2021-03-01",
    tags: ["language models", "llm", "nlp", "stochastic parrots", "bias", "ai"],
    metadata: {
      doi: "10.1145/3442188.3445922",
      registrationAgency: "ACM",
      resourceType: "proceedings-article",
      resolvedUrl: "https://dl.acm.org/doi/10.1145/3442188.3445922",
    } satisfies DoiMetadata,
  },
  {
    id: "10.1056/NEJMoa2001316",
    url: "https://doi.org/10.1056/NEJMoa2001316",
    title: "A Novel Coronavirus from Patients with Pneumonia in China, 2019",
    snippet: "Authors: Zhu, N., Zhang, D., Wang, W.",
    publishedAt: "2020-01-24",
    tags: ["coronavirus", "covid-19", "pneumonia", "china", "sars-cov-2", "nejm"],
    metadata: {
      doi: "10.1056/NEJMoa2001316",
      registrationAgency: "Massachusetts Medical Society",
      resourceType: "journal-article",
      resolvedUrl: "https://www.nejm.org/doi/10.1056/NEJMoa2001316",
    } satisfies DoiMetadata,
  },
];

/** Factory that returns a live or mock DOI source. */
export function createDoiSource(mock = false): DoiDataSourcePort {
  return mock ? new MockDoiDataSource() : new DoiDataSource();
}
