// TxLookup port + mock: fetch on-chain transaction data by hash or address for crypto claim verification.

import { ok, err, type Result } from "@veritas/core";
import { type DataSourcePort, type SourceDocument, type SourceQuery } from "@veritas/verifier-kit";

/** Domain-specific transaction lookup query. */
export interface TxLookupQuery {
  /** Full transaction hash (0x-prefixed). */
  readonly txHash?: string;
  /** Wallet or contract address to filter by sender/receiver. */
  readonly address?: string;
  /** EVM chain ID (e.g. 1 = mainnet, 137 = polygon). */
  readonly chainId?: number;
  readonly maxResults: number;
}

/** Normalized transaction record from on-chain data. */
export interface TxRecord {
  readonly txHash: string;
  readonly chainId: number;
  readonly chainName: string;
  readonly from: string;
  readonly to: string | null;
  readonly valueEth: string;
  readonly valueUsd: number | undefined;
  readonly blockNumber: number;
  readonly blockTimestamp: string;
  readonly status: "success" | "reverted" | "pending";
  readonly gasUsed: number | undefined;
}

/** Port interface for on-chain transaction lookups. */
export interface TxLookupPort extends DataSourcePort {
  readonly sourceId: "tx-lookup";
  /** Look up a transaction by hash on a specific chain. */
  lookupTx(txHash: string, chainId: number): Promise<Result<TxRecord, Error>>;
  /** List recent transactions for an address. */
  listAddressTxs(address: string, chainId: number, limit: number): Promise<Result<readonly TxRecord[], Error>>;
}

const CHAIN_NAMES: Readonly<Record<number, string>> = Object.freeze({
  1: "ethereum",
  137: "polygon",
  56: "bnb-chain",
  42161: "arbitrum-one",
  10: "optimism",
  8453: "base",
});

function chainName(chainId: number): string {
  return CHAIN_NAMES[chainId] ?? `chain-${chainId}`;
}

function txRecordToDoc(tx: TxRecord): SourceDocument {
  return {
    id: `${tx.chainId}:${tx.txHash}`,
    url: `https://etherscan.io/tx/${tx.txHash}`,
    title: `Transaction ${tx.txHash.slice(0, 10)}... on ${tx.chainName}`,
    snippet: `From ${tx.from} to ${tx.to ?? "contract-create"}, value ${tx.valueEth} ETH, status: ${tx.status}`,
    publishedAt: tx.blockTimestamp,
    metadata: { ...tx },
  };
}

/** Seed entry for MockTxLookup. */
export interface MockTxEntry extends TxRecord {
  /** Additional keywords matched during search. */
  readonly tags: readonly string[];
}

/** Mock TxLookupPort for offline development and testing. */
export class MockTxLookup implements TxLookupPort {
  readonly sourceId = "tx-lookup" as const;
  readonly displayName = "Mock On-Chain Transaction Lookup";

  private readonly byHash: ReadonlyMap<string, MockTxEntry>;
  private readonly byAddress: ReadonlyMap<string, readonly MockTxEntry[]>;

  constructor(seed: readonly MockTxEntry[] = []) {
    this.byHash = new Map(seed.map((e) => [e.txHash.toLowerCase(), e]));
    const addressMap = new Map<string, MockTxEntry[]>();
    for (const entry of seed) {
      const addrs = [entry.from, ...(entry.to ? [entry.to] : [])].map((a) => a.toLowerCase());
      for (const addr of addrs) {
        const list = addressMap.get(addr) ?? [];
        addressMap.set(addr, [...list, entry]);
      }
    }
    this.byAddress = addressMap;
  }

  async lookupTx(txHash: string, _chainId: number): Promise<Result<TxRecord, Error>> {
    const entry = this.byHash.get(txHash.toLowerCase());
    if (!entry) return err(new Error(`MockTxLookup: tx not found: ${txHash}`));
    return ok(entry);
  }

  async listAddressTxs(address: string, _chainId: number, limit: number): Promise<Result<readonly TxRecord[], Error>> {
    const list = this.byAddress.get(address.toLowerCase()) ?? [];
    return ok(list.slice(0, limit));
  }

  async search(query: SourceQuery): Promise<Result<readonly SourceDocument[], Error>> {
    const lower = query.keywords.map((k) => k.toLowerCase());
    const results = [...this.byHash.values()]
      .filter((e) => lower.some((kw) => e.tags.some((t) => t.toLowerCase().includes(kw)) || e.txHash.includes(kw) || e.from.includes(kw) || (e.to ?? "").includes(kw)))
      .slice(0, query.maxResults)
      .map(txRecordToDoc);
    return ok(results);
  }

  async fetch(id: string): Promise<Result<SourceDocument, Error>> {
    const hash = id.includes(":") ? id.split(":")[1] : id;
    const entry = this.byHash.get((hash ?? id).toLowerCase());
    if (!entry) return err(new Error(`MockTxLookup: document not found: ${id}`));
    return ok(txRecordToDoc(entry));
  }
}

/** Factory producing a MockTxLookup pre-seeded with representative mainnet-like data. */
export function createMockTxLookup(): TxLookupPort {
  const seed: MockTxEntry[] = [
    {
      txHash: "0xabc123def456abc123def456abc123def456abc123def456abc123def456abc123",
      chainId: 1,
      chainName: chainName(1),
      from: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
      to: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      valueEth: "0",
      valueUsd: 0,
      blockNumber: 19_000_000,
      blockTimestamp: "2024-01-15T12:00:00.000Z",
      status: "success",
      gasUsed: 63_000,
      tags: ["usdc", "transfer", "ethereum", "mainnet", "erc20"],
    },
    {
      txHash: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
      chainId: 137,
      chainName: chainName(137),
      from: "0x1234567890abcdef1234567890abcdef12345678",
      to: "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619",
      valueEth: "1.5",
      valueUsd: 3_450,
      blockNumber: 52_000_000,
      blockTimestamp: "2024-03-10T09:30:00.000Z",
      status: "success",
      gasUsed: 21_000,
      tags: ["polygon", "matic", "weth", "transfer"],
    },
    {
      txHash: "0xfailrevertfailrevertfailrevertfailrevertfailrevertfailrevertfail00",
      chainId: 1,
      chainName: chainName(1),
      from: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
      to: "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",
      valueEth: "0.5",
      valueUsd: 1_150,
      blockNumber: 19_100_000,
      blockTimestamp: "2024-02-01T08:00:00.000Z",
      status: "reverted",
      gasUsed: 42_000,
      tags: ["uniswap", "swap", "reverted", "ethereum"],
    },
  ];
  return new MockTxLookup(seed);
}
