// TokenData port + mock: retrieve token market cap, supply, and rank data for crypto claim verification.

import { ok, err, type Result } from "@veritas/core";
import { type DataSourcePort, type SourceDocument, type SourceQuery } from "@veritas/verifier-kit";

/** Market and supply metadata for a crypto token. */
export interface TokenRecord {
  readonly symbol: string;
  readonly name: string;
  readonly chainId: number | undefined;
  readonly contractAddress: string | undefined;
  readonly marketCapUsd: number | undefined;
  readonly circulatingSupply: number | undefined;
  readonly totalSupply: number | undefined;
  readonly rank: number | undefined;
  readonly dataDate: string;
}

/** Port interface for token market data lookups. */
export interface TokenDataPort extends DataSourcePort {
  readonly sourceId: "token-data";
  /** Look up token data by ticker symbol (case-insensitive). */
  getBySymbol(symbol: string): Promise<Result<TokenRecord, Error>>;
  /** Look up token data by contract address and chain. */
  getByAddress(address: string, chainId: number): Promise<Result<TokenRecord, Error>>;
  /** List top tokens by market cap up to limit. */
  listTopTokens(limit: number): Promise<Result<readonly TokenRecord[], Error>>;
}

function tokenToDoc(record: TokenRecord): SourceDocument {
  return {
    id: record.contractAddress ? `${record.chainId}:${record.contractAddress.toLowerCase()}` : `symbol:${record.symbol.toLowerCase()}`,
    url: `https://coinmarketcap.com/currencies/${record.name.toLowerCase().replace(/\s+/g, "-")}/`,
    title: `${record.name} (${record.symbol}) Token Data`,
    snippet: [
      record.rank ? `Rank #${record.rank}` : "",
      record.marketCapUsd ? `Market Cap: $${record.marketCapUsd.toLocaleString()}` : "",
      record.circulatingSupply ? `Circulating: ${record.circulatingSupply.toLocaleString()} ${record.symbol}` : "",
    ].filter(Boolean).join(" | "),
    publishedAt: record.dataDate,
    metadata: { ...record },
  };
}

/** Seed entry for MockTokenData. */
export interface MockTokenEntry extends TokenRecord {
  readonly tags: readonly string[];
}

/** Mock TokenDataPort for offline development and testing. */
export class MockTokenData implements TokenDataPort {
  readonly sourceId = "token-data" as const;
  readonly displayName = "Mock Token Market Data";

  private readonly bySymbol: ReadonlyMap<string, MockTokenEntry>;
  private readonly byAddress: ReadonlyMap<string, MockTokenEntry>;
  private readonly ranked: readonly MockTokenEntry[];

  constructor(seed: readonly MockTokenEntry[] = []) {
    this.bySymbol = new Map(seed.map((e) => [e.symbol.toLowerCase(), e]));
    this.byAddress = new Map(
      seed
        .filter((e) => e.contractAddress != null && e.chainId != null)
        .map((e) => [`${e.chainId}:${(e.contractAddress as string).toLowerCase()}`, e])
    );
    this.ranked = [...seed].sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity));
  }

  async getBySymbol(symbol: string): Promise<Result<TokenRecord, Error>> {
    const entry = this.bySymbol.get(symbol.toLowerCase());
    if (!entry) return err(new Error(`MockTokenData: symbol not found: ${symbol}`));
    return ok(entry);
  }

  async getByAddress(address: string, chainId: number): Promise<Result<TokenRecord, Error>> {
    const key = `${chainId}:${address.toLowerCase()}`;
    const entry = this.byAddress.get(key);
    if (!entry) return err(new Error(`MockTokenData: contract not found: ${address} on chain ${chainId}`));
    return ok(entry);
  }

  async listTopTokens(limit: number): Promise<Result<readonly TokenRecord[], Error>> {
    return ok(this.ranked.slice(0, limit));
  }

  async search(query: SourceQuery): Promise<Result<readonly SourceDocument[], Error>> {
    const lower = query.keywords.map((k) => k.toLowerCase());
    const results = [...this.bySymbol.values()]
      .filter((e) => lower.some((kw) => e.tags.some((t) => t.toLowerCase().includes(kw)) || e.symbol.toLowerCase().includes(kw) || e.name.toLowerCase().includes(kw)))
      .slice(0, query.maxResults)
      .map(tokenToDoc);
    return ok(results);
  }

  async fetch(id: string): Promise<Result<SourceDocument, Error>> {
    const entry = this.bySymbol.get(id.toLowerCase()) ?? this.byAddress.get(id.toLowerCase());
    if (!entry) return err(new Error(`MockTokenData: document not found: ${id}`));
    return ok(tokenToDoc(entry));
  }
}

/** Factory producing a MockTokenData pre-seeded with representative top-token data. */
export function createMockTokenData(): TokenDataPort {
  const DATA_DATE = "2024-06-01T00:00:00.000Z";
  const seed: MockTokenEntry[] = [
    {
      symbol: "BTC",
      name: "Bitcoin",
      chainId: undefined,
      contractAddress: undefined,
      marketCapUsd: 1_300_000_000_000,
      circulatingSupply: 19_700_000,
      totalSupply: 21_000_000,
      rank: 1,
      dataDate: DATA_DATE,
      tags: ["bitcoin", "btc", "crypto", "store-of-value", "pow"],
    },
    {
      symbol: "ETH",
      name: "Ethereum",
      chainId: 1,
      contractAddress: undefined,
      marketCapUsd: 450_000_000_000,
      circulatingSupply: 120_000_000,
      totalSupply: 120_000_000,
      rank: 2,
      dataDate: DATA_DATE,
      tags: ["ethereum", "eth", "smart-contract", "layer1", "pos"],
    },
    {
      symbol: "USDC",
      name: "USD Coin",
      chainId: 1,
      contractAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      marketCapUsd: 32_000_000_000,
      circulatingSupply: 32_000_000_000,
      totalSupply: 32_000_000_000,
      rank: 7,
      dataDate: DATA_DATE,
      tags: ["usdc", "stablecoin", "circle", "erc20", "dollar-peg"],
    },
    {
      symbol: "UNI",
      name: "Uniswap",
      chainId: 1,
      contractAddress: "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984",
      marketCapUsd: 5_800_000_000,
      circulatingSupply: 753_766_667,
      totalSupply: 1_000_000_000,
      rank: 22,
      dataDate: DATA_DATE,
      tags: ["uniswap", "uni", "dex", "defi", "governance", "amm"],
    },
    {
      symbol: "MATIC",
      name: "Polygon",
      chainId: 137,
      contractAddress: "0x0000000000000000000000000000000000001010",
      marketCapUsd: 8_500_000_000,
      circulatingSupply: 9_250_000_000,
      totalSupply: 10_000_000_000,
      rank: 15,
      dataDate: DATA_DATE,
      tags: ["polygon", "matic", "layer2", "sidechain", "scaling"],
    },
  ];
  return new MockTokenData(seed);
}
