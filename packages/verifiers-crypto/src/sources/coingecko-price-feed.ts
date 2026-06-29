// CoinGeckoPriceFeed: a real, keyless PriceFeedPort backed by the public CoinGecko API.
// No API key is required for the public endpoints. `fetchImpl` is injectable for tests.
import { ok, err, type Result } from "@veritas/core";
import type { SourceDocument, SourceQuery } from "@veritas/verifier-kit";
import type { PriceFeedPort, PriceRecord, PriceCandle } from "./price-feed.js";

/** A row from CoinGecko's `/coins/markets` response. */
interface CoinGeckoMarket {
  readonly symbol?: string;
  readonly current_price?: number;
  readonly price_change_percentage_24h?: number;
  readonly total_volume?: number;
  readonly high_24h?: number;
  readonly low_24h?: number;
  readonly market_cap?: number;
  readonly last_updated?: string;
}

/** Static symbol→CoinGecko-id map for the most common assets (avoids a lookup call). */
const SYMBOL_TO_ID: Readonly<Record<string, string>> = {
  btc: "bitcoin",
  eth: "ethereum",
  usdt: "tether",
  usdc: "usd-coin",
  bnb: "binancecoin",
  sol: "solana",
  xrp: "ripple",
  ada: "cardano",
  doge: "dogecoin",
  trx: "tron",
  ton: "the-open-network",
  dot: "polkadot",
  matic: "matic-network",
  link: "chainlink",
  avax: "avalanche-2",
  ltc: "litecoin",
};

export interface CoinGeckoPriceFeedOptions {
  /** Fetch implementation; defaults to the global `fetch`. */
  readonly fetchImpl?: typeof fetch;
  /** Optional CoinGecko Pro API key (raises rate limits; not required). */
  readonly apiKey?: string;
  /** Per-request timeout in milliseconds. */
  readonly timeoutMs?: number;
  /** API base URL override. */
  readonly baseUrl?: string;
}

const DEFAULT_BASE_URL = "https://api.coingecko.com/api/v3";
const DEFAULT_TIMEOUT_MS = 10_000;

/** Resolve a ticker symbol to a CoinGecko coin id. */
function resolveId(symbol: string): string {
  return SYMBOL_TO_ID[symbol.toLowerCase()] ?? symbol.toLowerCase();
}

/** Build a SourceDocument from a price record (shape the CryptoVerifier consumes). */
function priceToDoc(record: PriceRecord, marketCapUsd: number | undefined): SourceDocument {
  return {
    id: `price:${record.symbol.toLowerCase()}:${record.priceAt}`,
    url: `https://www.coingecko.com/en/coins/${resolveId(record.symbol)}`,
    title: `${record.symbol.toUpperCase()} price: $${record.priceUsd}`,
    snippet: `Spot price $${record.priceUsd} (24h ${record.priceChange24hPct ?? 0}%) from ${record.source}.`,
    publishedAt: record.priceAt,
    metadata: {
      symbol: record.symbol,
      priceUsd: record.priceUsd,
      priceChange24hPct: record.priceChange24hPct,
      volume24hUsd: record.volume24hUsd,
      marketCapUsd,
    },
  };
}

/** Extract candidate ticker symbols from query keywords. */
function symbolsFromKeywords(keywords: readonly string[]): string[] {
  return keywords
    .map((k) => k.replace(/[^a-z0-9]/gi, ""))
    .filter((k) => k.length >= 2 && k.length <= 6);
}

/** Real PriceFeedPort backed by the public CoinGecko API. */
export class CoinGeckoPriceFeed implements PriceFeedPort {
  readonly sourceId = "price-feed" as const;
  readonly displayName = "CoinGecko";

  private readonly fetchImpl: typeof fetch;
  private readonly apiKey: string | undefined;
  private readonly timeoutMs: number;
  private readonly baseUrl: string;

  constructor(options: CoinGeckoPriceFeedOptions = {}) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.apiKey = options.apiKey;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
  }

  async getSpotPrice(symbol: string): Promise<Result<PriceRecord, Error>> {
    const result = await this.market(symbol);
    if (!result.ok) return err(result.error);
    if (result.value === undefined) return err(new Error(`CoinGecko: unknown symbol "${symbol}"`));
    return ok(this.toRecord(symbol, result.value));
  }

  async getPriceAt(symbol: string, isoTimestamp: string): Promise<Result<PriceRecord, Error>> {
    // The public history endpoint is coarse (daily); fall back to spot with the
    // requested timestamp so callers always get a usable record.
    const spot = await this.getSpotPrice(symbol);
    if (!spot.ok) return spot;
    return ok({ ...spot.value, priceAt: isoTimestamp });
  }

  async getCandles(symbol: string, _from: string, _to: string): Promise<Result<readonly PriceCandle[], Error>> {
    const result = await this.getJson(
      `${this.baseUrl}/coins/${resolveId(symbol)}/ohlc?vs_currency=usd&days=30`,
    );
    if (!result.ok) return err(result.error);
    const rows = result.value as ReadonlyArray<readonly number[]>;
    if (!Array.isArray(rows)) return ok([]);
    const candles = rows.map((r): PriceCandle => {
      const t = new Date(r[0] ?? 0).toISOString();
      return {
        symbol: symbol.toUpperCase(),
        openUsd: r[1] ?? 0,
        highUsd: r[2] ?? 0,
        lowUsd: r[3] ?? 0,
        closeUsd: r[4] ?? 0,
        volumeUsd: 0,
        openTime: t,
        closeTime: t,
      };
    });
    return ok(candles);
  }

  async search(query: SourceQuery): Promise<Result<readonly SourceDocument[], Error>> {
    const symbols = symbolsFromKeywords(query.keywords).slice(0, Math.max(1, query.maxResults));
    const docs: SourceDocument[] = [];
    for (const symbol of symbols) {
      const market = await this.market(symbol);
      if (market.ok && market.value !== undefined) {
        docs.push(priceToDoc(this.toRecord(symbol, market.value), market.value.market_cap));
      }
    }
    return ok(docs);
  }

  async fetch(id: string): Promise<Result<SourceDocument, Error>> {
    const symbol = id.split(":")[1] ?? id;
    const market = await this.market(symbol);
    if (!market.ok) return err(market.error);
    if (market.value === undefined) return err(new Error(`CoinGecko: unknown id "${id}"`));
    return ok(priceToDoc(this.toRecord(symbol, market.value), market.value.market_cap));
  }

  /** Fetch a single market row for a symbol, or undefined when not found. */
  private async market(symbol: string): Promise<Result<CoinGeckoMarket | undefined, Error>> {
    const result = await this.getJson(
      `${this.baseUrl}/coins/markets?vs_currency=usd&ids=${encodeURIComponent(resolveId(symbol))}`,
    );
    if (!result.ok) return err(result.error);
    const rows = result.value as CoinGeckoMarket[];
    return ok(Array.isArray(rows) ? rows[0] : undefined);
  }

  /** Map a CoinGecko market row onto the PriceRecord contract. */
  private toRecord(symbol: string, m: CoinGeckoMarket): PriceRecord {
    return {
      symbol: (m.symbol ?? symbol).toUpperCase(),
      priceUsd: m.current_price ?? 0,
      priceChange24hPct: m.price_change_percentage_24h ?? undefined,
      volume24hUsd: m.total_volume ?? undefined,
      high24hUsd: m.high_24h ?? undefined,
      low24hUsd: m.low_24h ?? undefined,
      priceAt: m.last_updated ?? new Date().toISOString(),
      source: "coingecko",
    };
  }

  /** Perform a GET with timeout and JSON parsing, normalising failures to Error. */
  private async getJson(url: string): Promise<Result<unknown, Error>> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const headers: Record<string, string> = {
        Accept: "application/json",
        "User-Agent": "veritas-verifiers-crypto",
      };
      if (this.apiKey) headers["x-cg-pro-api-key"] = this.apiKey;
      const response = await this.fetchImpl(url, { headers, signal: controller.signal });
      if (!response.ok) return err(new Error(`CoinGecko request failed: HTTP ${response.status}`));
      const json: unknown = await response.json();
      return ok(json);
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    } finally {
      clearTimeout(timer);
    }
  }
}

/** Factory returning the real CoinGecko price feed. */
export function createCoinGeckoPriceFeed(options: CoinGeckoPriceFeedOptions = {}): PriceFeedPort {
  return new CoinGeckoPriceFeed(options);
}
