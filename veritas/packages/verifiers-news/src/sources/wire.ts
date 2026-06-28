// Wire data source port + mock: wire service (AP, Reuters, AFP, Bloomberg) story retrieval.

import { ok, err, isOk, type Result } from "@veritas/core";
import { MockDataSource } from "@veritas/verifier-kit";
import type { DataSourcePort, SourceDocument, SourceQuery } from "@veritas/verifier-kit";

/** Recognised wire service identifiers. */
export type WireServiceId = "ap" | "reuters" | "afp" | "bloomberg" | "other";

/** A story as reported by a wire service. */
export interface WireStory {
  readonly storyId: string;
  readonly wireService: WireServiceId;
  readonly headline: string;
  readonly dateline: string;
  readonly url: string;
  readonly publishedAt: string | null;
  readonly wordCount: number;
  readonly byline: string;
  readonly summary: string;
}

/** Port interface for wire service story retrieval. */
export interface WireDataSourcePort extends DataSourcePort {
  /** Fetch a specific wire story by its identifier. */
  fetchStory(storyId: string): Promise<Result<WireStory, Error>>;
  /** Search wire stories matching keywords; optionally filter to one service. */
  searchWireStories(
    keywords: ReadonlyArray<string>,
    service?: WireServiceId,
    maxResults?: number,
  ): Promise<Result<readonly WireStory[], Error>>;
}

/** Domain-to-wire-service mapping for identification. */
const WIRE_DOMAIN_MAP: ReadonlyMap<string, WireServiceId> = new Map([
  ["apnews.com", "ap"],
  ["reuters.com", "reuters"],
  ["afp.com", "afp"],
  ["bloomberg.com", "bloomberg"],
]);

function domainToWireService(url: string): WireServiceId {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    return WIRE_DOMAIN_MAP.get(hostname) ?? "other";
  } catch {
    return "other";
  }
}

function documentToWireStory(doc: SourceDocument): WireStory {
  return {
    storyId: doc.id,
    wireService: domainToWireService(doc.url),
    headline: doc.title,
    dateline: String(doc.metadata["dateline"] ?? ""),
    url: doc.url,
    publishedAt: doc.publishedAt,
    wordCount: typeof doc.metadata["wordCount"] === "number" ? doc.metadata["wordCount"] : 0,
    byline: String(doc.metadata["byline"] ?? ""),
    summary: doc.snippet,
  };
}

/** Live Wire adapter — queries a news search API filtered to wire service domains. */
export class WireDataSource implements WireDataSourcePort {
  readonly sourceId = "wire";
  readonly displayName = "Wire Services";

  private readonly baseUrl: string;
  private readonly apiKey: string;

  private static readonly WIRE_DOMAINS =
    "apnews.com,reuters.com,afp.com,bloomberg.com";

  constructor(baseUrl = "https://newsapi.org/v2", apiKey = "") {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  async search(query: SourceQuery): Promise<Result<readonly SourceDocument[], Error>> {
    try {
      const params = new URLSearchParams({
        q: query.keywords.join(" "),
        domains: query.domain ?? WireDataSource.WIRE_DOMAINS,
        sortBy: "publishedAt",
        pageSize: String(query.maxResults),
        ...(query.after ? { from: query.after } : {}),
        apiKey: this.apiKey,
      });
      const url = `${this.baseUrl}/everything?${params.toString()}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      if (!res.ok) return err(new Error(`Wire search HTTP ${res.status}`));
      const raw: unknown = await res.json();
      return ok(parseNewsApiArticles(raw, query.maxResults));
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  async fetch(id: string): Promise<Result<SourceDocument, Error>> {
    const result = await this.search({ keywords: [id], maxResults: 1 });
    if (!result.ok) return err(result.error as Error);
    const docs = result.value;
    if (docs.length === 0) return err(new Error(`Wire: story not found: ${id}`));
    return ok(docs[0]!);
  }

  async fetchStory(storyId: string): Promise<Result<WireStory, Error>> {
    const result = await this.fetch(storyId);
    if (!result.ok) return err(result.error as Error);
    return ok(documentToWireStory(result.value));
  }

  async searchWireStories(
    keywords: ReadonlyArray<string>,
    service?: WireServiceId,
    maxResults = 10,
  ): Promise<Result<readonly WireStory[], Error>> {
    const domainFilter = service ? wireServiceToDomain(service) : undefined;
    const result = await this.search({ keywords: [...keywords], maxResults, domain: domainFilter });
    if (!result.ok) return err(result.error as Error);
    const stories = result.value.map(documentToWireStory);
    const filtered = service ? stories.filter((s) => s.wireService === service) : stories;
    return ok(filtered);
  }
}

function wireServiceToDomain(service: WireServiceId): string | undefined {
  const map: Record<WireServiceId, string | undefined> = {
    ap: "apnews.com",
    reuters: "reuters.com",
    afp: "afp.com",
    bloomberg: "bloomberg.com",
    other: undefined,
  };
  return map[service];
}

function parseNewsApiArticles(raw: unknown, maxResults: number): readonly SourceDocument[] {
  if (typeof raw !== "object" || raw === null) return [];
  const obj = raw as Record<string, unknown>;
  const articles = Array.isArray(obj["articles"]) ? obj["articles"] : [];
  return articles.slice(0, maxResults).map((item): SourceDocument => {
    const src = typeof item === "object" && item !== null ? (item as Record<string, unknown>) : {};
    const source = typeof src["source"] === "object" && src["source"] !== null
      ? (src["source"] as Record<string, unknown>)
      : {};
    const url = String(src["url"] ?? "");
    return {
      id: url,
      url,
      title: String(src["title"] ?? ""),
      snippet: String(src["description"] ?? src["content"] ?? ""),
      publishedAt: typeof src["publishedAt"] === "string" ? src["publishedAt"] : null,
      metadata: {
        byline: src["author"] ?? "",
        sourceName: source["name"] ?? "",
        dateline: "",
        wordCount: 0,
      },
    };
  });
}

/** In-memory mock wire source for tests and local development. */
export class MockWireDataSource extends MockDataSource implements WireDataSourcePort {
  private readonly storyMap: ReadonlyMap<string, WireStory>;

  constructor() {
    super("wire", "Wire Services (mock)", WIRE_SEED);
    this.storyMap = new Map(WIRE_STORIES.map((s) => [s.storyId, s]));
  }

  async fetchStory(storyId: string): Promise<Result<WireStory, Error>> {
    const story = this.storyMap.get(storyId);
    if (!story) return err(new Error(`MockWireDataSource: story not found: ${storyId}`));
    return ok(story);
  }

  async searchWireStories(
    keywords: ReadonlyArray<string>,
    service?: WireServiceId,
    maxResults = 10,
  ): Promise<Result<readonly WireStory[], Error>> {
    const result = await this.search({ keywords: [...keywords], maxResults }) as Result<readonly SourceDocument[], Error>;
    if (!isOk(result)) return err(result.error);
    const stories = result.value.map(documentToWireStory);
    const filtered = service ? stories.filter((s) => s.wireService === service) : stories;
    return ok(filtered);
  }
}

const WIRE_STORIES: readonly WireStory[] = [
  {
    storyId: "ap-ceasefire-2024-001",
    wireService: "ap",
    headline: "CORRECTED-Ceasefire takes hold in southern region after UN mediation",
    dateline: "GENEVA, June 15",
    url: "https://apnews.com/article/ceasefire-2024-001",
    publishedAt: "2024-06-15T10:00:00Z",
    wordCount: 620,
    byline: "AP News Staff",
    summary: "A ceasefire agreement brokered by UN mediators took hold in the southern region Tuesday, bringing a pause to weeks of fighting.",
  },
  {
    storyId: "reuters-ceasefire-2024-001",
    wireService: "reuters",
    headline: "Ceasefire declared; both parties commit to 72-hour truce",
    dateline: "LONDON, June 15",
    url: "https://reuters.com/world/ceasefire-2024-001",
    publishedAt: "2024-06-15T11:30:00Z",
    wordCount: 540,
    byline: "Reuters Staff",
    summary: "Reuters: Both parties have committed to a 72-hour ceasefire effective Tuesday, pending full negotiations.",
  },
  {
    storyId: "bloomberg-markets-2024-001",
    wireService: "bloomberg",
    headline: "S&P 500 closes at record high amid easing inflation data",
    dateline: "NEW YORK, Nov. 15",
    url: "https://bloomberg.com/news/markets-2024-001",
    publishedAt: "2024-11-15T21:00:00Z",
    wordCount: 480,
    byline: "Bloomberg Markets Team",
    summary: "The S&P 500 index rose 1.2% to close at an all-time high after the latest CPI report showed inflation cooling faster than expected.",
  },
  {
    storyId: "ap-election-2024-001",
    wireService: "ap",
    headline: "AP Race Call: Incumbent wins re-election in tight contest",
    dateline: "WASHINGTON, Nov. 6",
    url: "https://apnews.com/article/election-race-call-2024",
    publishedAt: "2024-11-06T02:45:00Z",
    wordCount: 900,
    byline: "AP Political Desk",
    summary: "The Associated Press is calling the election for the incumbent candidate after key swing states reported final results.",
  },
  {
    storyId: "afp-climate-summit-2024-001",
    wireService: "afp",
    headline: "AFP: Climate summit ends with binding emissions accord",
    dateline: "PARIS, Dec. 1",
    url: "https://afp.com/news/climate-summit-2024",
    publishedAt: "2024-12-01T18:00:00Z",
    wordCount: 710,
    byline: "AFP Science Desk",
    summary: "AFP: A two-week climate summit concluded with 127 nations signing a legally binding accord committing to net-zero emissions by 2050.",
  },
];

const WIRE_SEED = WIRE_STORIES.map((s) => ({
  id: s.storyId,
  url: s.url,
  title: s.headline,
  snippet: s.summary,
  publishedAt: s.publishedAt,
  tags: [
    s.wireService,
    ...s.headline.toLowerCase().split(/\s+/).filter((w) => w.length > 4),
  ],
  metadata: {
    byline: s.byline,
    dateline: s.dateline,
    wordCount: s.wordCount,
    sourceName: s.wireService.toUpperCase(),
  } as Readonly<Record<string, unknown>>,
}));

/** Factory that returns a mock or live wire data source. */
export function createWireSource(mock = false, apiKey = ""): WireDataSourcePort {
  return mock ? new MockWireDataSource() : new WireDataSource(undefined, apiKey);
}
