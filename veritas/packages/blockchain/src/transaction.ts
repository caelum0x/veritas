// Transaction types and RPC transaction response shapes for EVM chains

import type { HexString } from "./hex.js";
import { hexToBigInt, hexToNumber } from "./hex.js";

export interface RpcTransactionResponse {
  readonly hash: HexString;
  readonly from: string;
  readonly to: string | null;
  readonly value: HexString;
  readonly gas: HexString;
  readonly gasPrice?: HexString;
  readonly maxFeePerGas?: HexString;
  readonly maxPriorityFeePerGas?: HexString;
  readonly nonce: HexString;
  readonly input: HexString;
  readonly blockHash: HexString | null;
  readonly blockNumber: HexString | null;
  readonly transactionIndex: HexString | null;
  readonly type: HexString;
  readonly chainId?: HexString;
  readonly v?: HexString;
  readonly r?: HexString;
  readonly s?: HexString;
}

export interface Transaction {
  readonly hash: HexString;
  readonly from: string;
  readonly to: string | null;
  readonly value: bigint;
  readonly gas: bigint;
  readonly gasPrice: bigint | undefined;
  readonly maxFeePerGas: bigint | undefined;
  readonly maxPriorityFeePerGas: bigint | undefined;
  readonly nonce: number;
  readonly input: HexString;
  readonly blockHash: HexString | null;
  readonly blockNumber: bigint | null;
  readonly transactionIndex: number | null;
  readonly type: number;
  readonly chainId: number | undefined;
}

export function parseTransaction(raw: RpcTransactionResponse): Transaction {
  return {
    hash: raw.hash,
    from: raw.from,
    to: raw.to,
    value: hexToBigInt(raw.value),
    gas: hexToBigInt(raw.gas),
    gasPrice: raw.gasPrice !== undefined ? hexToBigInt(raw.gasPrice) : undefined,
    maxFeePerGas: raw.maxFeePerGas !== undefined ? hexToBigInt(raw.maxFeePerGas) : undefined,
    maxPriorityFeePerGas:
      raw.maxPriorityFeePerGas !== undefined
        ? hexToBigInt(raw.maxPriorityFeePerGas)
        : undefined,
    nonce: hexToNumber(raw.nonce),
    input: raw.input,
    blockHash: raw.blockHash,
    blockNumber: raw.blockNumber !== null ? hexToBigInt(raw.blockNumber) : null,
    transactionIndex:
      raw.transactionIndex !== null ? hexToNumber(raw.transactionIndex) : null,
    type: hexToNumber(raw.type),
    chainId: raw.chainId !== undefined ? hexToNumber(raw.chainId) : undefined,
  };
}

export function isPending(tx: Transaction): boolean {
  return tx.blockHash === null;
}

export function isConfirmed(tx: Transaction): boolean {
  return tx.blockHash !== null && tx.blockNumber !== null;
}

export interface UnsignedTransaction {
  readonly to: string | null;
  readonly value?: bigint;
  readonly data?: HexString;
  readonly gas?: bigint;
  readonly maxFeePerGas?: bigint;
  readonly maxPriorityFeePerGas?: bigint;
  readonly nonce?: number;
  readonly chainId?: number;
}

export function serializeUnsignedTx(tx: UnsignedTransaction): Record<string, unknown> {
  const result: Record<string, unknown> = { to: tx.to };
  if (tx.value !== undefined) result["value"] = `0x${tx.value.toString(16)}`;
  if (tx.data !== undefined) result["data"] = tx.data;
  if (tx.gas !== undefined) result["gas"] = `0x${tx.gas.toString(16)}`;
  if (tx.maxFeePerGas !== undefined)
    result["maxFeePerGas"] = `0x${tx.maxFeePerGas.toString(16)}`;
  if (tx.maxPriorityFeePerGas !== undefined)
    result["maxPriorityFeePerGas"] = `0x${tx.maxPriorityFeePerGas.toString(16)}`;
  if (tx.nonce !== undefined) result["nonce"] = `0x${tx.nonce.toString(16)}`;
  if (tx.chainId !== undefined) result["chainId"] = `0x${tx.chainId.toString(16)}`;
  return result;
}
