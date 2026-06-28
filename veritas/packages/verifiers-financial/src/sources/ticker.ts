// Ticker data source port + mock: symbol lookup and company profile resolution.

import { ok, err, type Result } from "@veritas/core";
import { MockDataSource } from "@veritas/verifier-kit";
import type { DataSourcePort, SourceDocument, SourceQuery } from "@veritas/verifier-kit";

/** Company profile resolved from a ticker symbol. */
export interface TickerProfile {
  readonly symbol: string;
  readonly companyName: string;
  readonly exchange: string;
  readonly sector: string;
  readonly industry: string;
  readonly cik?: string;
  readonly isin?: string;
  readonly description: string;
  readonly website?: string;
  readonly employees?: number;
  readonly country: string;
  readonly currency: string;
}

/** Port interface for ticker symbol resolution. */
export interface TickerDataSourcePort extends DataSourcePort {
  /** Resolve a full company profile from a ticker symbol. */
  resolveProfile(symbol: string): Promise<Result<TickerProfile, Error>>;
  /** Search tickers matching a company name fragment. */
  searchByName(name: string): Promise<Result<readonly SourceDocument[], Error>>;
}

/** Live ticker adapter — uses a public financial data API. */
export class TickerDataSource implements TickerDataSourcePort {
  readonly sourceId = "ticker";
  readonly displayName = "Ticker Symbol Registry";

  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(baseUrl = "https://financialmodelingprep.com/api/v3", apiKey = "") {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  async search(query: SourceQuery): Promise<Result<readonly SourceDocument[], Error>> {
    try {
      const q = query.keywords.join(" ");
      const url = `${this.baseUrl}/search?query=${encodeURIComponent(q)}&limit=${query.maxResults}&apikey=${this.apiKey}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      if (!res.ok) return err(new Error(`Ticker search HTTP ${res.status}`));
      const raw: unknown = await res.json();
      return ok(parseTickerSearchResponse(raw, query.maxResults));
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  async fetch(id: string): Promise<Result<SourceDocument, Error>> {
    const profileResult = await this.resolveProfile(id);
    if (profileResult.ok === false) return err(profileResult.error as Error);
    return ok(profileToDocument(profileResult.value));
  }

  async resolveProfile(symbol: string): Promise<Result<TickerProfile, Error>> {
    try {
      const url = `${this.baseUrl}/profile/${encodeURIComponent(symbol)}?apikey=${this.apiKey}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      if (!res.ok) return err(new Error(`Ticker profile HTTP ${res.status}`));
      const raw: unknown = await res.json();
      if (!Array.isArray(raw) || raw.length === 0) return err(new Error(`No profile for ${symbol}`));
      return ok(parseTickerProfile(raw[0] as Record<string, unknown>));
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  async searchByName(name: string): Promise<Result<readonly SourceDocument[], Error>> {
    return this.search({ keywords: [name], maxResults: 10 });
  }
}

function parseTickerSearchResponse(raw: unknown, maxResults: number): readonly SourceDocument[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, maxResults).map((item): SourceDocument => {
    const src = typeof item === "object" && item !== null ? (item as Record<string, unknown>) : {};
    const symbol = String(src["symbol"] ?? "");
    return {
      id: symbol,
      url: `https://finance.yahoo.com/quote/${symbol}`,
      title: `${symbol} — ${String(src["name"] ?? "")}`,
      snippet: `Exchange: ${String(src["exchangeShortName"] ?? "")}. Sector: ${String(src["stockExchange"] ?? "")}.`,
      publishedAt: null,
      metadata: { symbol, exchange: src["exchangeShortName"], name: src["name"] },
    };
  });
}

function parseTickerProfile(src: Record<string, unknown>): TickerProfile {
  return {
    symbol: String(src["symbol"] ?? ""),
    companyName: String(src["companyName"] ?? ""),
    exchange: String(src["exchange"] ?? ""),
    sector: String(src["sector"] ?? ""),
    industry: String(src["industry"] ?? ""),
    cik: typeof src["cik"] === "string" ? src["cik"] : undefined,
    isin: typeof src["isin"] === "string" ? src["isin"] : undefined,
    description: String(src["description"] ?? ""),
    website: typeof src["website"] === "string" ? src["website"] : undefined,
    employees: typeof src["fullTimeEmployees"] === "number" ? src["fullTimeEmployees"] : undefined,
    country: String(src["country"] ?? "US"),
    currency: String(src["currency"] ?? "USD"),
  };
}

function profileToDocument(profile: TickerProfile): SourceDocument {
  return {
    id: profile.symbol,
    url: profile.website ?? `https://finance.yahoo.com/quote/${profile.symbol}`,
    title: `${profile.symbol} — ${profile.companyName}`,
    snippet: profile.description.slice(0, 200),
    publishedAt: null,
    metadata: { ...profile },
  };
}

/** In-memory mock ticker source for tests and local development. */
export class MockTickerDataSource extends MockDataSource implements TickerDataSourcePort {
  private readonly profiles: ReadonlyMap<string, TickerProfile>;

  constructor() {
    super("ticker", "Ticker Symbol Registry (mock)", TICKER_SEED);
    this.profiles = new Map(TICKER_PROFILES.map((p) => [p.symbol.toUpperCase(), p]));
  }

  async resolveProfile(symbol: string): Promise<Result<TickerProfile, Error>> {
    const profile = this.profiles.get(symbol.toUpperCase());
    if (!profile) return err(new Error(`MockTickerDataSource: no profile for ${symbol}`));
    return ok(profile);
  }

  async searchByName(name: string): Promise<Result<readonly SourceDocument[], Error>> {
    return this.search({ keywords: [name], maxResults: 10 });
  }
}

const TICKER_PROFILES: readonly TickerProfile[] = [
  { symbol: "AAPL", companyName: "Apple Inc.", exchange: "NASDAQ", sector: "Technology", industry: "Consumer Electronics", cik: "320193", description: "Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories.", website: "https://www.apple.com", employees: 164000, country: "US", currency: "USD" },
  { symbol: "TSLA", companyName: "Tesla Inc.", exchange: "NASDAQ", sector: "Consumer Cyclical", industry: "Auto Manufacturers", cik: "1318605", description: "Tesla designs, develops, manufactures, leases, and sells electric vehicles, energy generation and storage systems.", website: "https://www.tesla.com", employees: 127855, country: "US", currency: "USD" },
  { symbol: "GOOGL", companyName: "Alphabet Inc.", exchange: "NASDAQ", sector: "Communication Services", industry: "Internet Content & Information", cik: "1652044", description: "Alphabet Inc. provides various products and platforms in the United States, Europe, and globally.", website: "https://abc.xyz", employees: 182381, country: "US", currency: "USD" },
  { symbol: "MSFT", companyName: "Microsoft Corporation", exchange: "NASDAQ", sector: "Technology", industry: "Software-Infrastructure", cik: "789019", description: "Microsoft Corporation develops and supports software, services, devices, and solutions worldwide.", website: "https://www.microsoft.com", employees: 221000, country: "US", currency: "USD" },
];

const TICKER_SEED = TICKER_PROFILES.map((p) => ({
  id: p.symbol,
  url: p.website ?? `https://finance.yahoo.com/quote/${p.symbol}`,
  title: `${p.symbol} — ${p.companyName}`,
  snippet: p.description.slice(0, 200),
  publishedAt: null as null,
  tags: [p.symbol.toLowerCase(), p.companyName.toLowerCase(), p.sector.toLowerCase(), p.industry.toLowerCase()],
  metadata: { ...p } as Readonly<Record<string, unknown>>,
}));

/** Factory that returns a mock or live ticker source. */
export function createTickerSource(mock = false, apiKey = ""): TickerDataSourcePort {
  return mock ? new MockTickerDataSource() : new TickerDataSource(undefined, apiKey);
}
