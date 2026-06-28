// Transaction receipt types and RPC receipt response shapes for EVM chains

import type { HexString } from "./hex.js";
import { hexToBigInt, hexToNumber } from "./hex.js";

export interface RpcLog {
  readonly address: string;
  readonly topics: readonly HexString[];
  readonly data: HexString;
  readonly blockNumber: HexString;
  readonly transactionHash: HexString;
  readonly transactionIndex: HexString;
  readonly blockHash: HexString;
  readonly logIndex: HexString;
  readonly removed: boolean;
}

export interface Log {
  readonly address: string;
  readonly topics: readonly HexString[];
  readonly data: HexString;
  readonly blockNumber: bigint;
  readonly transactionHash: HexString;
  readonly transactionIndex: number;
  readonly blockHash: HexString;
  readonly logIndex: number;
  readonly removed: boolean;
}

export function parseLog(raw: RpcLog): Log {
  return {
    address: raw.address,
    topics: raw.topics,
    data: raw.data,
    blockNumber: hexToBigInt(raw.blockNumber),
    transactionHash: raw.transactionHash,
    transactionIndex: hexToNumber(raw.transactionIndex),
    blockHash: raw.blockHash,
    logIndex: hexToNumber(raw.logIndex),
    removed: raw.removed,
  };
}

export interface RpcReceipt {
  readonly transactionHash: HexString;
  readonly transactionIndex: HexString;
  readonly blockHash: HexString;
  readonly blockNumber: HexString;
  readonly from: string;
  readonly to: string | null;
  readonly cumulativeGasUsed: HexString;
  readonly gasUsed: HexString;
  readonly contractAddress: string | null;
  readonly logs: readonly RpcLog[];
  readonly logsBloom: HexString;
  readonly status: HexString;
  readonly effectiveGasPrice: HexString;
  readonly type: HexString;
}

export interface Receipt {
  readonly transactionHash: HexString;
  readonly transactionIndex: number;
  readonly blockHash: HexString;
  readonly blockNumber: bigint;
  readonly from: string;
  readonly to: string | null;
  readonly cumulativeGasUsed: bigint;
  readonly gasUsed: bigint;
  readonly contractAddress: string | null;
  readonly logs: readonly Log[];
  readonly logsBloom: HexString;
  readonly status: "success" | "reverted";
  readonly effectiveGasPrice: bigint;
  readonly type: number;
}

export function parseReceipt(raw: RpcReceipt): Receipt {
  return {
    transactionHash: raw.transactionHash,
    transactionIndex: hexToNumber(raw.transactionIndex),
    blockHash: raw.blockHash,
    blockNumber: hexToBigInt(raw.blockNumber),
    from: raw.from,
    to: raw.to,
    cumulativeGasUsed: hexToBigInt(raw.cumulativeGasUsed),
    gasUsed: hexToBigInt(raw.gasUsed),
    contractAddress: raw.contractAddress,
    logs: raw.logs.map(parseLog),
    logsBloom: raw.logsBloom,
    status: raw.status === "0x1" ? "success" : "reverted",
    effectiveGasPrice: hexToBigInt(raw.effectiveGasPrice),
    type: hexToNumber(raw.type),
  };
}

export function isSuccess(receipt: Receipt): boolean {
  return receipt.status === "success";
}

export function isReverted(receipt: Receipt): boolean {
  return receipt.status === "reverted";
}

export function gasCost(receipt: Receipt): bigint {
  return receipt.gasUsed * receipt.effectiveGasPrice;
}
