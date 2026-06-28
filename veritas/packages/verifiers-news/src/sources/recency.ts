// Recency data source port + mock: temporal relevance and freshness analysis for news claims.

import { ok, err, isOk, type Result } from "@veritas/core";
import { MockDataSource } from "@veritas/verifier-kit";
import type { DataSourcePort, SourceDocument, SourceQuery } from "@veritas/verifier-kit";

/** Temporal freshness classification for a news claim. */
export type RecencyClass =
  | "breaking"      // < 6 hours
  | "fresh"         // 6 – 48 hours
  | "recent"        // 2 – 7 days
  | "dated"         // 7 – 30 days
  | "archived"      // > 30 days
  | "unknown";

/** Temporal analysis result for a claim's news coverage. */
export interface RecencyReport {
  readonly claimDate: string | null;
  readonly oldestConfirmingSource: string | null;
  readonly newestConfirmingSource: string | null;
  readonly ageHours: number | null;
  readonly recencyClass: RecencyClass;
  readonly isCurrentlyReported: boolean;
  readonly hasUpdates: boolean;
  readonly updateCount: number;
  readonly sourceCount: number;
}

/** Port interface for recency and freshness queries. */
export interface RecencyPort extends DataSourcePort {
  /** Analyse temporal relevance of a claim based on keywords and optional claimDate. */
  analyseRecency(
    keywords: ReadonlyArray<string>,
    claimDate?: string,
  ): Promise<Result<RecencyReport, Error>>;
}

/** Hours thresholds for recency classification. */
const BREAKING_HOURS = 6;
const FRESH_HOURS = 48;
const RECENT_HOURS = 168;   // 7 days
const DATED_HOURS = 720;    // 30 days

function classifyAge(ageHours: number): RecencyClass {
  if (ageHours < BREAKING_HOURS) return "breaking";
  if (ageHours < FRESH_HOURS) return "fresh";
  if (ageHours < RECENT_HOURS) return "recent";
  if (ageHours < DATED_HOURS) return "dated";
  return "archived";
}

function computeAgeHours(publishedAt: string | null, now: Date): number | null {
  if (!publishedAt) return null;
  const parsed = Date.parse(publishedAt);
  if (isNaN(parsed)) return null;
  return (now.getTime() - parsed) / 3_600_000;
}

function buildRecencyReport(
  docs: ReadonlyArray<SourceDocument>,
  claimDate?: string,
): RecencyReport {
  const now = new Date();
  const dated = docs
    .map((d) => d.publishedAt)
    .filter((d): d is string => typeof d === "string" && d.length > 0)
    .sort();

  const oldestConfirmingSource = dated[0] ?? null;
  const newestConfirmingSource = dated[dated.length - 1] ?? null;
  const refDate = newestConfirmingSource ?? claimDate ?? null;
  const ageHours = computeAgeHours(refDate, now);
  const recencyClass: RecencyClass = ageHours !== null ? classifyAge(ageHours) : "unknown";
  const isCurrentlyReported = recencyClass === "breaking" || recencyClass === "fresh";

  return Object.freeze({
    claimDate: claimDate ?? null,
    oldestConfirmingSource,
    newestConfirmingSource,
    ageHours,
    recencyClass,
    isCurrentlyReported,
    hasUpdates: docs.length > 1,
    updateCount: Math.max(0, docs.length - 1),
    sourceCount: docs.length,
  });
}

/** Live Recency adapter — queries a news search API filtered by date. */
export class RecencyDataSource implements RecencyPort {
  readonly sourceId = "recency";
  readonly displayName = "News Recency Analyser";

  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(baseUrl = "https://newsapi.org/v2", apiKey = "") {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  async search(query: SourceQuery): Promise<Result<readonly SourceDocument[], Error>> {
    try {
      const params = new URLSearchParams({
        q: query.keywords.join(" "),
        sortBy: "publishedAt",
        pageSize: String(query.maxResults),
        ...(query.after ? { from: query.after } : {}),
        apiKey: this.apiKey,
      });
      const url = `${this.baseUrl}/everything?${params.toString()}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      if (!res.ok) return err(new Error(`Recency search HTTP ${res.status}`));
      const raw: unknown = await res.json();
      return ok(parseNewsApiResponse(raw, query.maxResults));
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  async fetch(id: string): Promise<Result<SourceDocument, Error>> {
    const result = await this.search({ keywords: [id], maxResults: 1 });
    if (!result.ok) return err(result.error as Error);
    const docs = result.value;
    if (docs.length === 0) return err(new Error(`Recency: document not found: ${id}`));
    return ok(docs[0]!);
  }

  async analyseRecency(
    keywords: ReadonlyArray<string>,
    claimDate?: string,
  ): Promise<Result<RecencyReport, Error>> {
    const result: Result<readonly SourceDocument[], Error> = await this.search({ keywords: [...keywords], maxResults: 20 });
    if (!isOk(result)) return err(result.error);
    return ok(buildRecencyReport(result.value, claimDate));
  }
}

function parseNewsApiResponse(raw: unknown, maxResults: number): readonly SourceDocument[] {
  if (typeof raw !== "object" || raw === null) return [];
  const obj = raw as Record<string, unknown>;
  const articles = Array.isArray(obj["articles"]) ? obj["articles"] : [];
  return articles.slice(0, maxResults).map((item): SourceDocument => {
    const src = typeof item === "object" && item !== null ? (item as Record<string, unknown>) : {};
    const url = String(src["url"] ?? "");
    return {
      id: url,
      url,
      title: String(src["title"] ?? ""),
      snippet: String(src["description"] ?? ""),
      publishedAt: typeof src["publishedAt"] === "string" ? src["publishedAt"] : null,
      metadata: { author: src["author"], sourceName: src["source"] },
    };
  });
}

/** In-memory mock recency source for tests and local development. */
export class MockRecencyDataSource extends MockDataSource implements RecencyPort {
  constructor() {
    super("recency", "News Recency Analyser (mock)", RECENCY_SEED);
  }

  async analyseRecency(
    keywords: ReadonlyArray<string>,
    claimDate?: string,
  ): Promise<Result<RecencyReport, Error>> {
    const result = await this.search({ keywords: [...keywords], maxResults: 20 }) as Result<readonly SourceDocument[], Error>;
    if (!isOk(result)) return err(result.error);
    return ok(buildRecencyReport(result.value, claimDate));
  }
}

const RECENCY_SEED = [
  {
    id: "reuters-ceasefire-breaking",
    url: "https://reuters.com/world/ceasefire-breaking-2025",
    title: "BREAKING: Ceasefire declared in ongoing conflict",
    snippet: "Reuters: A ceasefire has been declared by both parties effective immediately.",
    publishedAt: new Date(Date.now() - 2 * 3_600_000).toISOString(),
    tags: ["ceasefire", "breaking", "conflict", "declared"],
    metadata: { sourceName: "Reuters" } as Readonly<Record<string, unknown>>,
  },
  {
    id: "apnews-election-fresh",
    url: "https://apnews.com/article/election-results-fresh",
    title: "Election results confirmed — incumbent leads by 8 points",
    snippet: "AP: Election officials confirmed results showing the incumbent ahead by 8 percentage points.",
    publishedAt: new Date(Date.now() - 30 * 3_600_000).toISOString(),
    tags: ["election", "results", "confirmed", "incumbent", "vote"],
    metadata: { sourceName: "Associated Press" } as Readonly<Record<string, unknown>>,
  },
  {
    id: "bbc-climate-recent",
    url: "https://bbc.com/news/climate-deal-recent",
    title: "Climate deal update: signatory nations submit plans",
    snippet: "BBC: Nations that signed the climate deal have begun submitting their implementation plans.",
    publishedAt: new Date(Date.now() - 5 * 24 * 3_600_000).toISOString(),
    tags: ["climate", "deal", "update", "nations", "plans"],
    metadata: { sourceName: "BBC" } as Readonly<Record<string, unknown>>,
  },
  {
    id: "nytimes-vaccine-dated",
    url: "https://nytimes.com/vaccine-rollout-update",
    title: "Vaccine rollout reaches 70% coverage in major cities",
    snippet: "The New York Times reports vaccine coverage has reached 70% in most major metropolitan areas.",
    publishedAt: new Date(Date.now() - 15 * 24 * 3_600_000).toISOString(),
    tags: ["vaccine", "rollout", "coverage", "cities", "health"],
    metadata: { sourceName: "The New York Times" } as Readonly<Record<string, unknown>>,
  },
];

/** Factory that returns a mock or live recency source. */
export function createRecencySource(mock = false, apiKey = ""): RecencyPort {
  return mock ? new MockRecencyDataSource() : new RecencyDataSource(undefined, apiKey);
}
