// EvmRpcTxLookup: a real, keyless TxLookupPort backed by public EVM JSON-RPC
// endpoints. Looks up a transaction by hash (eth_getTransactionByHash +
// eth_getTransactionReceipt + eth_getBlockByNumber). `fetchImpl` is injectable
// for tests. No API key is required for the default public endpoints.
import { ok, err, type Result } from "@veritas/core";
import type { SourceDocument, SourceQuery } from "@veritas/verifier-kit";
import type { TxLookupPort, TxRecord } from "./tx-lookup.js";

/** Default keyless public JSON-RPC endpoint per EVM chain id. */
const DEFAULT_RPC_URLS: Readonly<Record<number, string>> = Object.freeze({
  1: "https://ethereum-rpc.publicnode.com",
  137: "https://polygon-bor-rpc.publicnode.com",
  56: "https://bsc-rpc.publicnode.com",
  42161: "https://arbitrum-one-rpc.publicnode.com",
  10: "https://optimism-rpc.publicnode.com",
  8453: "https://base-rpc.publicnode.com",
});

const CHAIN_NAMES: Readonly<Record<number, string>> = Object.freeze({
  1: "ethereum",
  137: "polygon",
  56: "bnb-chain",
  42161: "arbitrum-one",
  10: "optimism",
  8453: "base",
});

/** Block-explorer base URL per chain, for building a human-facing tx link. */
const EXPLORER_TX_URLS: Readonly<Record<number, string>> = Object.freeze({
  1: "https://etherscan.io/tx/",
  137: "https://polygonscan.com/tx/",
  56: "https://bscscan.com/tx/",
  42161: "https://arbiscan.io/tx/",
  10: "https://optimistic.etherscan.io/tx/",
  8453: "https://basescan.org/tx/",
});

const DEFAULT_TIMEOUT_MS = 12_000;
const WEI_PER_ETH = 10n ** 18n;
const TX_HASH_RE = /\b0x[0-9a-fA-F]{64}\b/;

function chainName(chainId: number): string {
  return CHAIN_NAMES[chainId] ?? `chain-${chainId}`;
}

/** Convert a wei hex quantity to a decimal ETH string without precision loss. */
function weiHexToEth(weiHex: string | undefined): string {
  if (!weiHex) return "0";
  let wei: bigint;
  try {
    wei = BigInt(weiHex);
  } catch {
    return "0";
  }
  const whole = wei / WEI_PER_ETH;
  const frac = (wei % WEI_PER_ETH).toString().padStart(18, "0").replace(/0+$/, "");
  return frac.length > 0 ? `${whole}.${frac}` : whole.toString();
}

/** Parse a hex quantity (e.g. "0x5208") to a number, or undefined when absent. */
function hexToNumber(hex: string | null | undefined): number | undefined {
  if (hex === null || hex === undefined) return undefined;
  const n = Number.parseInt(hex, 16);
  return Number.isFinite(n) ? n : undefined;
}

/** Shape of an eth_getTransactionByHash result (only the fields we read). */
interface RpcTransaction {
  readonly hash?: string;
  readonly from?: string;
  readonly to?: string | null;
  readonly value?: string;
  readonly blockNumber?: string | null;
}

/** Shape of an eth_getTransactionReceipt result (only the fields we read). */
interface RpcReceipt {
  readonly status?: string;
  readonly gasUsed?: string;
}

/** Shape of an eth_getBlockByNumber result (only the fields we read). */
interface RpcBlock {
  readonly timestamp?: string;
}

function txRecordToDoc(tx: TxRecord, explorerBase: string): SourceDocument {
  return {
    id: `${tx.chainId}:${tx.txHash}`,
    url: `${explorerBase}${tx.txHash}`,
    title: `Transaction ${tx.txHash.slice(0, 10)}... on ${tx.chainName}`,
    snippet: `From ${tx.from} to ${tx.to ?? "contract-create"}, value ${tx.valueEth} ETH, status: ${tx.status}`,
    publishedAt: tx.blockTimestamp || null,
    metadata: { ...tx },
  };
}

export interface EvmRpcTxLookupOptions {
  /** Fetch implementation; defaults to the global `fetch`. */
  readonly fetchImpl?: typeof fetch;
  /** Per-request timeout in milliseconds. */
  readonly timeoutMs?: number;
  /** Override or extend the chainId→RPC-URL map (merged over the defaults). */
  readonly rpcUrls?: Readonly<Record<number, string>>;
}

/** Real TxLookupPort backed by public EVM JSON-RPC endpoints. */
export class EvmRpcTxLookup implements TxLookupPort {
  readonly sourceId = "tx-lookup" as const;
  readonly displayName = "EVM JSON-RPC Transaction Lookup";

  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;
  private readonly rpcUrls: Readonly<Record<number, string>>;

  constructor(options: EvmRpcTxLookupOptions = {}) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.rpcUrls = { ...DEFAULT_RPC_URLS, ...(options.rpcUrls ?? {}) };
  }

  async lookupTx(txHash: string, chainId: number): Promise<Result<TxRecord, Error>> {
    const rpcUrl = this.rpcUrls[chainId];
    if (rpcUrl === undefined) {
      return err(new Error(`EvmRpcTxLookup: no RPC endpoint configured for chain ${chainId}`));
    }

    const txResult = await this.rpcCall<RpcTransaction | null>(rpcUrl, "eth_getTransactionByHash", [txHash]);
    if (!txResult.ok) return err(txResult.error);
    const tx = txResult.value;
    if (tx === null || tx === undefined) {
      return err(new Error(`EvmRpcTxLookup: transaction not found: ${txHash} on chain ${chainId}`));
    }

    // Receipt (status, gasUsed) and block (timestamp) enrich the record but are
    // not fatal if unavailable — a pending tx has neither yet.
    const [receiptResult, blockTimestamp] = await Promise.all([
      this.rpcCall<RpcReceipt | null>(rpcUrl, "eth_getTransactionReceipt", [txHash]),
      this.fetchBlockTimestamp(rpcUrl, tx.blockNumber),
    ]);

    const receipt = receiptResult.ok ? receiptResult.value : null;
    const isPending = tx.blockNumber === null || tx.blockNumber === undefined;
    const status: TxRecord["status"] = isPending
      ? "pending"
      : receipt?.status === "0x0"
        ? "reverted"
        : "success";

    return ok({
      txHash: tx.hash ?? txHash,
      chainId,
      chainName: chainName(chainId),
      from: tx.from ?? "",
      to: tx.to ?? null,
      valueEth: weiHexToEth(tx.value),
      valueUsd: undefined,
      blockNumber: hexToNumber(tx.blockNumber) ?? 0,
      // Required by the port contract; empty when the block is not yet mined.
      blockTimestamp: blockTimestamp ?? "",
      status,
      gasUsed: hexToNumber(receipt?.gasUsed),
    });
  }

  async listAddressTxs(
    _address: string,
    _chainId: number,
    _limit: number,
  ): Promise<Result<readonly TxRecord[], Error>> {
    // Raw JSON-RPC nodes cannot enumerate an address's transaction history;
    // that requires an indexer (e.g. Etherscan/Covalent) behind an API key.
    // Return an explicit error rather than fabricate results.
    return err(
      new Error(
        "EvmRpcTxLookup: address transaction history requires an indexer API and is not available over public JSON-RPC",
      ),
    );
  }

  async search(query: SourceQuery): Promise<Result<readonly SourceDocument[], Error>> {
    const hash = query.keywords.map((k) => TX_HASH_RE.exec(k)?.[0]).find((h): h is string => h !== undefined);
    if (hash === undefined) return ok([]);

    // Default to Ethereum mainnet for keyword-only search; callers needing a
    // specific chain use lookupTx(hash, chainId) directly.
    const result = await this.lookupTx(hash, 1);
    if (!result.ok) return ok([]);
    return ok([txRecordToDoc(result.value, EXPLORER_TX_URLS[1]!)]);
  }

  async fetch(id: string): Promise<Result<SourceDocument, Error>> {
    const [chainPart, hashPart] = id.includes(":") ? id.split(":") : ["1", id];
    const chainId = Number.parseInt(chainPart ?? "1", 10);
    const hash = hashPart ?? id;
    const result = await this.lookupTx(hash, Number.isFinite(chainId) ? chainId : 1);
    if (!result.ok) return err(result.error);
    const explorer = EXPLORER_TX_URLS[result.value.chainId] ?? EXPLORER_TX_URLS[1]!;
    return ok(txRecordToDoc(result.value, explorer));
  }

  /** Fetch a block's ISO timestamp, or null when the block is unavailable. */
  private async fetchBlockTimestamp(rpcUrl: string, blockNumber: string | null | undefined): Promise<string | null> {
    if (blockNumber === null || blockNumber === undefined) return null;
    const result = await this.rpcCall<RpcBlock | null>(rpcUrl, "eth_getBlockByNumber", [blockNumber, false]);
    if (!result.ok || result.value === null || result.value === undefined) return null;
    const seconds = hexToNumber(result.value.timestamp);
    return seconds === undefined ? null : new Date(seconds * 1000).toISOString();
  }

  /** Perform a single JSON-RPC call with timeout, normalising failures. */
  private async rpcCall<T>(rpcUrl: string, method: string, params: readonly unknown[]): Promise<Result<T, Error>> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImpl(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
        signal: controller.signal,
      });
      if (!response.ok) return err(new Error(`EVM RPC request failed: HTTP ${response.status}`));
      const json = (await response.json()) as { result?: T; error?: { message?: string } };
      if (json.error) return err(new Error(`EVM RPC error: ${json.error.message ?? "unknown"}`));
      return ok(json.result as T);
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    } finally {
      clearTimeout(timer);
    }
  }
}

/** Factory returning the real public-RPC transaction lookup. */
export function createEvmRpcTxLookup(options: EvmRpcTxLookupOptions = {}): TxLookupPort {
  return new EvmRpcTxLookup(options);
}
