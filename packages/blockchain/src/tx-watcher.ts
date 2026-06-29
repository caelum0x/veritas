// Watch transaction confirmations by polling receipt until threshold met

import { sleep, withTimeout, type AppError, InternalError, ok, err, type Result } from "@veritas/core";
import type { HexString } from "./hex.js";
import type { Provider } from "./provider.js";

export interface TxWatcherOptions {
  /** Provider used to fetch receipts and block numbers */
  readonly provider: Provider;
  /** How many confirmations to wait for (default: 1) */
  readonly confirmations?: number;
  /** Poll interval in milliseconds (default: 2000) */
  readonly pollIntervalMs?: number;
  /** Total timeout in milliseconds (default: 120_000) */
  readonly timeoutMs?: number;
}

export interface TxReceipt {
  readonly txHash: HexString;
  readonly blockNumber: bigint;
  readonly blockHash: HexString;
  readonly status: "success" | "reverted";
  readonly gasUsed: bigint;
  readonly confirmations: number;
}

interface RawReceipt {
  readonly blockNumber: HexString;
  readonly blockHash: HexString;
  readonly status: HexString;
  readonly gasUsed: HexString;
}

function parseReceipt(raw: RawReceipt, txHash: HexString, currentBlock: bigint): TxReceipt {
  const blockNumber = BigInt(raw.blockNumber);
  const confirmations = Number(currentBlock - blockNumber) + 1;
  return {
    txHash,
    blockNumber,
    blockHash: raw.blockHash as HexString,
    status: raw.status === "0x1" ? "success" : "reverted",
    gasUsed: BigInt(raw.gasUsed),
    confirmations,
  };
}

export async function watchTx(
  txHash: HexString,
  options: TxWatcherOptions
): Promise<Result<TxReceipt, AppError>> {
  const {
    provider,
    confirmations = 1,
    pollIntervalMs = 2_000,
    timeoutMs = 120_000,
  } = options;

  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const rawResult = await provider.request<RawReceipt | null>(
      "eth_getTransactionReceipt",
      [txHash]
    );

    const raw = rawResult as RawReceipt | null;

    if (raw !== null && raw !== undefined) {
      const blockResult = await provider.request<HexString>("eth_blockNumber");
      const currentBlock = BigInt(blockResult as HexString);
      const receipt = parseReceipt(raw, txHash, currentBlock);

      if (receipt.confirmations >= confirmations) {
        return ok(receipt);
      }
    }

    const remaining = deadline - Date.now();
    if (remaining <= 0) break;

    await sleep(Math.min(pollIntervalMs, remaining));
  }

  return err(
    new InternalError({
      message: `Transaction ${txHash} not confirmed within ${timeoutMs}ms`,
      details: { txHash, timeoutMs, confirmations },
    })
  );
}

export interface TxWatcher {
  watch(txHash: HexString): Promise<Result<TxReceipt, AppError>>;
}

export function createTxWatcher(options: TxWatcherOptions): TxWatcher {
  return {
    watch: (txHash) => watchTx(txHash, options),
  };
}
