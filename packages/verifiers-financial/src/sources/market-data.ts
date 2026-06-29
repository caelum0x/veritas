// MarketData data source port + mock: real-time and historical price/volume data.

import { ok, err, type Result } from "@veritas/core";
import { MockDataSource } from "@veritas/verifier-kit";
import type { DataSourcePort, SourceDocument, SourceQuery } from "@veritas/verifier-kit";

/** A single OHLCV bar (open, high, low, close, volume). */
export interface OhlcvBar {
  readonly date: string;
  readonly open: number;
  readonly high: number;
  readonly low: number;
  readonly close: number;
  readonly volume: number;
  readonly adjClose?: number;
}

/** Latest price quote for a ticker. */
export interface MarketQuote {
  readonly symbol: string;
  readonly price: number;
  readonly change: number;
  readonly changePercent: number;
  readonly volume: number;
  readonly marketCap: number;
  readonly high52w: number;
  readonly low52w: number;
  readonly quotedAt: string;
}

/** Port interface for market price and volume data. */
export interface MarketDataSourcePort extends DataSourcePort {
  /** Fetch the latest quote for a symbol. */
  fetchQuote(symbol: string): Promise<Result<MarketQuote, Error>>;
  /** Fetch historical daily OHLCV bars. */
  fetchHistory(symbol: string, from: string, to: string): Promise<Result<readonly OhlcvBar[], Error>>;
}

/** Live market data adapter. */
export class MarketDataSource implements MarketDataSourcePort {
  readonly sourceId = "market-data";
  readonly displayName = "Market Data";

  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(baseUrl = "https://financialmodelingprep.com/api/v3", apiKey = "") {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  async search(query: SourceQuery): Promise<Result<readonly SourceDocument[], Error>> {
    const symbol = query.keywords[0] ?? "";
    const quoteResult = await this.fetchQuote(symbol);
    if (quoteResult.ok === false) return ok([]);
    return ok([quoteToDocument(quoteResult.value)]);
  }

  async fetch(id: string): Promise<Result<SourceDocument, Error>> {
    const quoteResult = await this.fetchQuote(id);
    if (quoteResult.ok === false) return err(quoteResult.error as Error);
    return ok(quoteToDocument(quoteResult.value));
  }

  async fetchQuote(symbol: string): Promise<Result<MarketQuote, Error>> {
    try {
      const url = `${this.baseUrl}/quote/${encodeURIComponent(symbol)}?apikey=${this.apiKey}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      if (!res.ok) return err(new Error(`MarketData quote HTTP ${res.status}`));
      const raw: unknown = await res.json();
      if (!Array.isArray(raw) || raw.length === 0) return err(new Error(`No quote for ${symbol}`));
      return ok(parseQuote(raw[0] as Record<string, unknown>));
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  async fetchHistory(symbol: string, from: string, to: string): Promise<Result<readonly OhlcvBar[], Error>> {
    try {
      const url = `${this.baseUrl}/historical-price-full/${encodeURIComponent(symbol)}?from=${from}&to=${to}&apikey=${this.apiKey}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
      if (!res.ok) return err(new Error(`MarketData history HTTP ${res.status}`));
      const raw: unknown = await res.json();
      if (typeof raw !== "object" || raw === null) return err(new Error("Unexpected history shape"));
      const src = raw as Record<string, unknown>;
      const historical = Array.isArray(src["historical"]) ? (src["historical"] as unknown[]) : [];
      return ok(historical.map((item) => parseBar(item as Record<string, unknown>)));
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }
}

function parseQuote(src: Record<string, unknown>): MarketQuote {
  return {
    symbol: String(src["symbol"] ?? ""),
    price: num(src["price"]),
    change: num(src["change"]),
    changePercent: num(src["changesPercentage"]),
    volume: num(src["volume"]),
    marketCap: num(src["marketCap"]),
    high52w: num(src["yearHigh"]),
    low52w: num(src["yearLow"]),
    quotedAt: String(src["timestamp"] ?? new Date().toISOString()),
  };
}

function parseBar(src: Record<string, unknown>): OhlcvBar {
  return {
    date: String(src["date"] ?? ""),
    open: num(src["open"]),
    high: num(src["high"]),
    low: num(src["low"]),
    close: num(src["close"]),
    volume: num(src["volume"]),
    adjClose: typeof src["adjClose"] === "number" ? src["adjClose"] : undefined,
  };
}

function num(v: unknown): number {
  return typeof v === "number" ? v : 0;
}

function quoteToDocument(q: MarketQuote): SourceDocument {
  return {
    id: q.symbol,
    url: `https://finance.yahoo.com/quote/${q.symbol}`,
    title: `${q.symbol} Market Quote`,
    snippet: `Price: $${q.price.toFixed(2)}, Change: ${q.changePercent.toFixed(2)}%, Market Cap: $${(q.marketCap / 1e9).toFixed(1)}B, 52w High: $${q.high52w.toFixed(2)}, 52w Low: $${q.low52w.toFixed(2)}.`,
    publishedAt: q.quotedAt,
    metadata: { ...q } as Readonly<Record<string, unknown>>,
  };
}

/** In-memory mock market data source for tests and local development. */
export class MockMarketDataSource extends MockDataSource implements MarketDataSourcePort {
  private readonly quotes: ReadonlyMap<string, MarketQuote>;
  private readonly history: ReadonlyMap<string, readonly OhlcvBar[]>;

  constructor() {
    super("market-data", "Market Data (mock)", []);
    this.quotes = new Map(MOCK_QUOTES.map((q) => [q.symbol.toUpperCase(), q]));
    this.history = new Map(MOCK_HISTORY.map(([sym, bars]) => [sym.toUpperCase(), bars]));
  }

  override async search(query: SourceQuery) {
    const symbol = (query.keywords[0] ?? "").toUpperCase();
    const q = this.quotes.get(symbol);
    if (!q) return ok([] as readonly SourceDocument[]);
    return ok([quoteToDocument(q)] as readonly SourceDocument[]);
  }

  async fetch(id: string): Promise<Result<SourceDocument, Error>> {
    const q = this.quotes.get(id.toUpperCase());
    if (!q) return err(new Error(`MockMarketData: no quote for ${id}`));
    return ok(quoteToDocument(q));
  }

  async fetchQuote(symbol: string): Promise<Result<MarketQuote, Error>> {
    const q = this.quotes.get(symbol.toUpperCase());
    if (!q) return err(new Error(`MockMarketData: no quote for ${symbol}`));
    return ok(q);
  }

  async fetchHistory(symbol: string, from: string, to: string): Promise<Result<readonly OhlcvBar[], Error>> {
    const bars = this.history.get(symbol.toUpperCase()) ?? [];
    const filtered = bars.filter((b) => b.date >= from && b.date <= to);
    return ok(filtered);
  }
}

const MOCK_QUOTES: readonly MarketQuote[] = [
  { symbol: "AAPL", price: 189.30, change: 1.20, changePercent: 0.64, volume: 54_320_000, marketCap: 2_950_000_000_000, high52w: 199.62, low52w: 164.08, quotedAt: "2024-01-31T21:00:00Z" },
  { symbol: "TSLA", price: 202.00, change: -3.50, changePercent: -1.71, volume: 98_200_000, marketCap: 643_000_000_000, high52w: 299.29, low52w: 152.37, quotedAt: "2024-01-31T21:00:00Z" },
  { symbol: "GOOGL", price: 153.00, change: 0.80, changePercent: 0.52, volume: 21_400_000, marketCap: 1_910_000_000_000, high52w: 153.78, low52w: 100.02, quotedAt: "2024-01-31T21:00:00Z" },
  { symbol: "MSFT", price: 405.00, change: 2.10, changePercent: 0.52, volume: 19_500_000, marketCap: 3_010_000_000_000, high52w: 420.82, low52w: 309.98, quotedAt: "2024-01-31T21:00:00Z" },
];

const MOCK_HISTORY: readonly [string, readonly OhlcvBar[]][] = [
  ["AAPL", [
    { date: "2024-01-31", open: 187.00, high: 190.20, low: 186.50, close: 189.30, volume: 54_320_000 },
    { date: "2024-01-30", open: 185.50, high: 188.10, low: 184.80, close: 186.10, volume: 47_800_000 },
    { date: "2024-01-29", open: 184.00, high: 186.40, low: 183.20, close: 185.50, volume: 39_100_000 },
  ]],
  ["TSLA", [
    { date: "2024-01-31", open: 206.00, high: 208.50, low: 200.10, close: 202.00, volume: 98_200_000 },
    { date: "2024-01-30", open: 210.00, high: 212.00, low: 205.00, close: 205.50, volume: 87_600_000 },
  ]],
];

/** Factory that returns a mock or live market data source. */
export function createMarketDataSource(mock = false, apiKey = ""): MarketDataSourcePort {
  return mock ? new MockMarketDataSource() : new MarketDataSource(undefined, apiKey);
}
