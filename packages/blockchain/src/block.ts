// Block types and RPC block response shapes for EVM chains

import type { HexString } from "./hex.js";
import { hexToBigInt, hexToNumber } from "./hex.js";

export interface RpcBlock {
  readonly hash: HexString;
  readonly parentHash: HexString;
  readonly number: HexString;
  readonly timestamp: HexString;
  readonly nonce: HexString;
  readonly difficulty: HexString;
  readonly gasLimit: HexString;
  readonly gasUsed: HexString;
  readonly miner: string;
  readonly extraData: HexString;
  readonly baseFeePerGas?: HexString;
  readonly transactions: string[] | RpcTransaction[];
}

export interface RpcTransaction {
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
}

export interface Block {
  readonly hash: HexString;
  readonly parentHash: HexString;
  readonly number: bigint;
  readonly timestamp: bigint;
  readonly nonce: HexString;
  readonly difficulty: bigint;
  readonly gasLimit: bigint;
  readonly gasUsed: bigint;
  readonly miner: string;
  readonly extraData: HexString;
  readonly baseFeePerGas: bigint | undefined;
  readonly transactionHashes: readonly HexString[];
}

export function parseBlock(raw: RpcBlock): Block {
  const txHashes: HexString[] = raw.transactions.map((tx) =>
    typeof tx === "string" ? (tx as HexString) : tx.hash
  );

  return {
    hash: raw.hash,
    parentHash: raw.parentHash,
    number: hexToBigInt(raw.number),
    timestamp: hexToBigInt(raw.timestamp),
    nonce: raw.nonce,
    difficulty: hexToBigInt(raw.difficulty),
    gasLimit: hexToBigInt(raw.gasLimit),
    gasUsed: hexToBigInt(raw.gasUsed),
    miner: raw.miner,
    extraData: raw.extraData,
    baseFeePerGas: raw.baseFeePerGas !== undefined ? hexToBigInt(raw.baseFeePerGas) : undefined,
    transactionHashes: txHashes,
  };
}

export interface BlockWithTransactions extends Omit<Block, "transactionHashes"> {
  readonly transactions: readonly ParsedTransaction[];
}

export interface ParsedTransaction {
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
}

export function parseTxInBlock(raw: RpcTransaction): ParsedTransaction {
  return {
    hash: raw.hash,
    from: raw.from,
    to: raw.to,
    value: hexToBigInt(raw.value),
    gas: hexToBigInt(raw.gas),
    gasPrice: raw.gasPrice !== undefined ? hexToBigInt(raw.gasPrice) : undefined,
    maxFeePerGas: raw.maxFeePerGas !== undefined ? hexToBigInt(raw.maxFeePerGas) : undefined,
    maxPriorityFeePerGas:
      raw.maxPriorityFeePerGas !== undefined ? hexToBigInt(raw.maxPriorityFeePerGas) : undefined,
    nonce: hexToNumber(raw.nonce),
    input: raw.input,
    blockHash: raw.blockHash,
    blockNumber: raw.blockNumber !== null ? hexToBigInt(raw.blockNumber) : null,
    transactionIndex:
      raw.transactionIndex !== null ? hexToNumber(raw.transactionIndex) : null,
    type: hexToNumber(raw.type),
  };
}
