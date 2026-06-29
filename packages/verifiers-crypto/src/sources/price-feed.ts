// PriceFeed port + mock: retrieve real-time and historical token price data for crypto claim verification.

import { ok, err, type Result } from "@veritas/core";
import { type DataSourcePort, type SourceDocument, type SourceQuery } from "@veritas/verifier-kit";

/** Snapshot of a token's price at a point in time. */
export interface PriceRecord {
  readonly symbol: string;
  readonly priceUsd: number;
  readonly priceChange24hPct: number | undefined;
  readonly volume24hUsd: number | undefined;
  readonly high24hUsd: number | undefined;
  readonly low24hUsd: number | undefined;
  readonly priceAt: string;
  readonly source: string;
}

/** Historical OHLCV candle. */
export interface PriceCandle {
  readonly symbol: string;
  readonly openUsd: number;
  readonly highUsd: number;
  readonly lowUsd: number;
  readonly closeUsd: number;
  readonly volumeUsd: number;
  readonly openTime: string;
  readonly closeTime: string;
}

/** Port interface for token price feed queries. */
export interface PriceFeedPort extends DataSourcePort {
  readonly sourceId: "price-feed";
  /** Get the latest spot price for a symbol. */
  getSpotPrice(symbol: string): Promise<Result<PriceRecord, Error>>;
  /** Get price at a specific ISO timestamp (nearest available). */
  getPriceAt(symbol: string, isoTimestamp: string): Promise<Result<PriceRecord, Error>>;
  /** Get daily OHLCV candles for a symbol over a date range. */
  getCandles(symbol: string, from: string, to: string): Promise<Result<readonly PriceCandle[], Error>>;
}

function priceToDoc(record: PriceRecord): SourceDocument {
  return {
    id: `price:${record.symbol.toLowerCase()}:${record.priceAt}`,
    url: `https://coinmarketcap.com/currencies/${record.symbol.toLowerCase()}/`,
    title: `${record.symbol} Price — $${record.priceUsd.toLocaleString()} at ${record.priceAt}`,
    snippet: [
      `Price: $${record.priceUsd.toLocaleString()}`,
      record.priceChange24hPct != null ? `24h: ${record.priceChange24hPct > 0 ? "+" : ""}${record.priceChange24hPct.toFixed(2)}%` : "",
      record.volume24hUsd != null ? `Vol: $${record.volume24hUsd.toLocaleString()}` : "",
    ].filter(Boolean).join(" | "),
    publishedAt: record.priceAt,
    metadata: { ...record },
  };
}

/** Seed entry for MockPriceFeed. */
export interface MockPriceEntry {
  readonly record: PriceRecord;
  readonly candles: readonly PriceCandle[];
  readonly tags: readonly string[];
}

/** Mock PriceFeedPort for offline development and testing. */
export class MockPriceFeed implements PriceFeedPort {
  readonly sourceId = "price-feed" as const;
  readonly displayName = "Mock Crypto Price Feed";

  private readonly bySymbol: ReadonlyMap<string, MockPriceEntry>;

  constructor(seed: readonly MockPriceEntry[] = []) {
    this.bySymbol = new Map(seed.map((e) => [e.record.symbol.toLowerCase(), e]));
  }

  async getSpotPrice(symbol: string): Promise<Result<PriceRecord, Error>> {
    const entry = this.bySymbol.get(symbol.toLowerCase());
    if (!entry) return err(new Error(`MockPriceFeed: symbol not found: ${symbol}`));
    return ok(entry.record);
  }

  async getPriceAt(symbol: string, isoTimestamp: string): Promise<Result<PriceRecord, Error>> {
    const entry = this.bySymbol.get(symbol.toLowerCase());
    if (!entry) return err(new Error(`MockPriceFeed: symbol not found: ${symbol}`));
    // Return nearest candle close price or fall back to spot.
    const target = new Date(isoTimestamp).getTime();
    let best: PriceCandle | undefined;
    let bestDelta = Infinity;
    for (const candle of entry.candles) {
      const delta = Math.abs(new Date(candle.closeTime).getTime() - target);
      if (delta < bestDelta) { bestDelta = delta; best = candle; }
    }
    if (best) {
      return ok({ ...entry.record, priceUsd: best.closeUsd, priceAt: best.closeTime });
    }
    return ok({ ...entry.record, priceAt: isoTimestamp });
  }

  async getCandles(symbol: string, from: string, to: string): Promise<Result<readonly PriceCandle[], Error>> {
    const entry = this.bySymbol.get(symbol.toLowerCase());
    if (!entry) return err(new Error(`MockPriceFeed: symbol not found: ${symbol}`));
    const fromMs = new Date(from).getTime();
    const toMs = new Date(to).getTime();
    const filtered = entry.candles.filter((c) => {
      const t = new Date(c.openTime).getTime();
      return t >= fromMs && t <= toMs;
    });
    return ok(filtered);
  }

  async search(query: SourceQuery): Promise<Result<readonly SourceDocument[], Error>> {
    const lower = query.keywords.map((k) => k.toLowerCase());
    const results = [...this.bySymbol.values()]
      .filter((e) => lower.some((kw) => e.tags.some((t) => t.toLowerCase().includes(kw)) || e.record.symbol.toLowerCase().includes(kw)))
      .slice(0, query.maxResults)
      .map((e) => priceToDoc(e.record));
    return ok(results);
  }

  async fetch(id: string): Promise<Result<SourceDocument, Error>> {
    // id format: "price:<symbol>:<timestamp>" or just "<symbol>"
    const symbol = id.startsWith("price:") ? id.split(":")[1] : id;
    const entry = this.bySymbol.get((symbol ?? id).toLowerCase());
    if (!entry) return err(new Error(`MockPriceFeed: document not found: ${id}`));
    return ok(priceToDoc(entry.record));
  }
}

/** Build daily candles between two dates at a fixed price (simple mock helper). */
function buildFlatCandles(symbol: string, fromDate: string, days: number, price: number, volumeUsd: number): PriceCandle[] {
  const candles: PriceCandle[] = [];
  const start = new Date(fromDate);
  for (let i = 0; i < days; i++) {
    const open = new Date(start.getTime() + i * 86_400_000);
    const close = new Date(open.getTime() + 86_400_000 - 1);
    const jitter = 1 + (Math.sin(i * 1.7) * 0.03);
    candles.push({
      symbol,
      openUsd: price,
      highUsd: price * (jitter > 1 ? jitter : 1),
      lowUsd: price * (jitter < 1 ? jitter : 1),
      closeUsd: price * (1 + Math.sin(i * 2.3) * 0.02),
      volumeUsd,
      openTime: open.toISOString(),
      closeTime: close.toISOString(),
    });
  }
  return candles;
}

/** Factory producing a MockPriceFeed pre-seeded with representative price data. */
export function createMockPriceFeed(): PriceFeedPort {
  const SPOT_DATE = "2024-06-01T12:00:00.000Z";
  const CANDLE_START = "2024-01-01T00:00:00.000Z";
  const seed: MockPriceEntry[] = [
    {
      record: { symbol: "BTC", priceUsd: 67_500, priceChange24hPct: 2.4, volume24hUsd: 35_000_000_000, high24hUsd: 68_100, low24hUsd: 65_900, priceAt: SPOT_DATE, source: "mock-price-feed" },
      candles: buildFlatCandles("BTC", CANDLE_START, 90, 50_000, 25_000_000_000),
      tags: ["bitcoin", "btc", "crypto", "store-of-value"],
    },
    {
      record: { symbol: "ETH", priceUsd: 3_750, priceChange24hPct: 1.8, volume24hUsd: 18_000_000_000, high24hUsd: 3_820, low24hUsd: 3_680, priceAt: SPOT_DATE, source: "mock-price-feed" },
      candles: buildFlatCandles("ETH", CANDLE_START, 90, 2_200, 12_000_000_000),
      tags: ["ethereum", "eth", "smart-contract", "layer1"],
    },
    {
      record: { symbol: "USDC", priceUsd: 1.0, priceChange24hPct: 0.01, volume24hUsd: 7_000_000_000, high24hUsd: 1.001, low24hUsd: 0.999, priceAt: SPOT_DATE, source: "mock-price-feed" },
      candles: buildFlatCandles("USDC", CANDLE_START, 90, 1.0, 5_000_000_000),
      tags: ["usdc", "stablecoin", "circle", "dollar-peg"],
    },
    {
      record: { symbol: "UNI", priceUsd: 7.85, priceChange24hPct: -0.9, volume24hUsd: 180_000_000, high24hUsd: 8.1, low24hUsd: 7.6, priceAt: SPOT_DATE, source: "mock-price-feed" },
      candles: buildFlatCandles("UNI", CANDLE_START, 90, 6.5, 150_000_000),
      tags: ["uniswap", "uni", "dex", "defi", "governance"],
    },
    {
      record: { symbol: "MATIC", priceUsd: 0.92, priceChange24hPct: -1.2, volume24hUsd: 450_000_000, high24hUsd: 0.95, low24hUsd: 0.89, priceAt: SPOT_DATE, source: "mock-price-feed" },
      candles: buildFlatCandles("MATIC", CANDLE_START, 90, 0.85, 350_000_000),
      tags: ["polygon", "matic", "layer2", "scaling"],
    },
  ];
  return new MockPriceFeed(seed);
}
