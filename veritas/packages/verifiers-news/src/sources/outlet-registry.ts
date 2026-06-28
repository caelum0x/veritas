// OutletRegistry data source port + mock: news outlet credibility and tier resolution.

import { ok, err, type Result } from "@veritas/core";
import { MockDataSource } from "@veritas/verifier-kit";
import type { DataSourcePort, SourceDocument, SourceQuery } from "@veritas/verifier-kit";

/** Credibility tier assigned to a news outlet. */
export type OutletTier = "tier1" | "tier2" | "tier3" | "unknown";

/** Full profile for a registered news outlet. */
export interface OutletProfile {
  readonly name: string;
  readonly domain: string;
  readonly tier: OutletTier;
  readonly country: string;
  readonly language: string;
  readonly isWireService: boolean;
  readonly isSatireOrParody: boolean;
  readonly hasEditorialStandards: boolean;
  readonly description: string;
  readonly founded?: number;
  readonly reachMillions?: number;
}

/** Port interface for outlet credibility lookups. */
export interface OutletRegistryPort extends DataSourcePort {
  /** Resolve a full outlet profile from its domain name. */
  resolveByDomain(domain: string): Promise<Result<OutletProfile, Error>>;
  /** Search outlets by name fragment. */
  searchByName(name: string): Promise<Result<readonly SourceDocument[], Error>>;
}

/** Live OutletRegistry adapter — queries a remote outlet credibility API. */
export class OutletRegistryDataSource implements OutletRegistryPort {
  readonly sourceId = "outlet-registry";
  readonly displayName = "News Outlet Registry";

  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(baseUrl = "https://newsguardtech.com/api/v1", apiKey = "") {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  async search(query: SourceQuery): Promise<Result<readonly SourceDocument[], Error>> {
    try {
      const q = query.keywords.join(" ");
      const url = `${this.baseUrl}/outlets?q=${encodeURIComponent(q)}&limit=${query.maxResults}&apikey=${this.apiKey}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      if (!res.ok) return err(new Error(`OutletRegistry search HTTP ${res.status}`));
      const raw: unknown = await res.json();
      return ok(parseOutletSearchResponse(raw, query.maxResults));
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  async fetch(id: string): Promise<Result<SourceDocument, Error>> {
    const result = await this.resolveByDomain(id);
    if (!result.ok) return err(result.error as Error);
    return ok(profileToDocument(result.value));
  }

  async resolveByDomain(domain: string): Promise<Result<OutletProfile, Error>> {
    try {
      const url = `${this.baseUrl}/outlets/${encodeURIComponent(domain)}?apikey=${this.apiKey}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      if (!res.ok) return err(new Error(`OutletRegistry fetch HTTP ${res.status}`));
      const raw: unknown = await res.json();
      return ok(parseOutletProfile(raw));
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  async searchByName(name: string): Promise<Result<readonly SourceDocument[], Error>> {
    return this.search({ keywords: [name], maxResults: 10 });
  }
}

function parseOutletSearchResponse(raw: unknown, maxResults: number): readonly SourceDocument[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, maxResults).map((item): SourceDocument => {
    const src = typeof item === "object" && item !== null ? (item as Record<string, unknown>) : {};
    const domain = String(src["domain"] ?? "");
    return {
      id: domain,
      url: `https://${domain}`,
      title: String(src["name"] ?? domain),
      snippet: String(src["description"] ?? ""),
      publishedAt: null,
      metadata: { domain, tier: src["tier"], country: src["country"] },
    };
  });
}

function parseOutletProfile(raw: unknown): OutletProfile {
  const src = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  const tier = String(src["tier"] ?? "unknown");
  return {
    name: String(src["name"] ?? ""),
    domain: String(src["domain"] ?? ""),
    tier: (["tier1", "tier2", "tier3"].includes(tier) ? tier : "unknown") as OutletTier,
    country: String(src["country"] ?? "US"),
    language: String(src["language"] ?? "en"),
    isWireService: src["isWireService"] === true,
    isSatireOrParody: src["isSatireOrParody"] === true,
    hasEditorialStandards: src["hasEditorialStandards"] === true,
    description: String(src["description"] ?? ""),
    founded: typeof src["founded"] === "number" ? src["founded"] : undefined,
    reachMillions: typeof src["reachMillions"] === "number" ? src["reachMillions"] : undefined,
  };
}

function profileToDocument(profile: OutletProfile): SourceDocument {
  return {
    id: profile.domain,
    url: `https://${profile.domain}`,
    title: profile.name,
    snippet: profile.description,
    publishedAt: null,
    metadata: { ...profile },
  };
}

/** In-memory mock outlet registry for tests and local development. */
export class MockOutletRegistryDataSource extends MockDataSource implements OutletRegistryPort {
  private readonly profileMap: ReadonlyMap<string, OutletProfile>;

  constructor() {
    super("outlet-registry", "News Outlet Registry (mock)", OUTLET_SEED);
    this.profileMap = new Map(OUTLET_PROFILES.map((p) => [p.domain.toLowerCase(), p]));
  }

  async resolveByDomain(domain: string): Promise<Result<OutletProfile, Error>> {
    const profile = this.profileMap.get(domain.toLowerCase().replace(/^www\./, ""));
    if (!profile) return err(new Error(`MockOutletRegistry: no profile for domain "${domain}"`));
    return ok(profile);
  }

  async searchByName(name: string): Promise<Result<readonly SourceDocument[], Error>> {
    return this.search({ keywords: [name], maxResults: 10 });
  }
}

const OUTLET_PROFILES: readonly OutletProfile[] = [
  { name: "Reuters", domain: "reuters.com", tier: "tier1", country: "GB", language: "en", isWireService: true, isSatireOrParody: false, hasEditorialStandards: true, description: "International news organization headquartered in London.", founded: 1851, reachMillions: 1000 },
  { name: "Associated Press", domain: "apnews.com", tier: "tier1", country: "US", language: "en", isWireService: true, isSatireOrParody: false, hasEditorialStandards: true, description: "American not-for-profit news agency founded in 1846.", founded: 1846, reachMillions: 500 },
  { name: "BBC News", domain: "bbc.com", tier: "tier1", country: "GB", language: "en", isWireService: false, isSatireOrParody: false, hasEditorialStandards: true, description: "British public service broadcaster with global news coverage.", founded: 1922, reachMillions: 450 },
  { name: "The New York Times", domain: "nytimes.com", tier: "tier1", country: "US", language: "en", isWireService: false, isSatireOrParody: false, hasEditorialStandards: true, description: "American daily newspaper based in New York City.", founded: 1851, reachMillions: 130 },
  { name: "The Washington Post", domain: "washingtonpost.com", tier: "tier1", country: "US", language: "en", isWireService: false, isSatireOrParody: false, hasEditorialStandards: true, description: "Major American daily newspaper published in Washington, D.C.", founded: 1877, reachMillions: 100 },
  { name: "CNN", domain: "cnn.com", tier: "tier2", country: "US", language: "en", isWireService: false, isSatireOrParody: false, hasEditorialStandards: true, description: "American pay television news channel.", founded: 1980, reachMillions: 200 },
  { name: "Bloomberg", domain: "bloomberg.com", tier: "tier1", country: "US", language: "en", isWireService: false, isSatireOrParody: false, hasEditorialStandards: true, description: "Global business and financial media company.", founded: 1981, reachMillions: 75 },
  { name: "The Onion", domain: "theonion.com", tier: "unknown", country: "US", language: "en", isWireService: false, isSatireOrParody: true, hasEditorialStandards: false, description: "American satirical digital media company.", founded: 1988, reachMillions: 10 },
];

const OUTLET_SEED = OUTLET_PROFILES.map((p) => ({
  id: p.domain,
  url: `https://${p.domain}`,
  title: p.name,
  snippet: p.description,
  publishedAt: null as null,
  tags: [p.name.toLowerCase(), p.domain.toLowerCase(), p.country.toLowerCase(), p.tier],
  metadata: { ...p } as Readonly<Record<string, unknown>>,
}));

/** Factory that returns a mock or live outlet registry source. */
export function createOutletRegistrySource(mock = false, apiKey = ""): OutletRegistryPort {
  return mock ? new MockOutletRegistryDataSource() : new OutletRegistryDataSource(undefined, apiKey);
}
