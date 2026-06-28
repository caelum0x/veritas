// RPC method wrappers for common eth_ calls using a Provider

import type { Provider, BlockTag } from "./provider.js";
import type { HexString } from "./hex.js";
import { hexToBigInt } from "./hex.js";
import { parseBlock, type Block, type RpcBlock } from "./block.js";
import { parseTransaction, type Transaction, type RpcTransactionResponse } from "./transaction.js";
import { parseReceipt, type Receipt, type RpcReceipt } from "./receipt.js";

export async function getBlockByNumber(
  provider: Provider,
  blockNumber: bigint,
  includeTransactions = false
): Promise<Block | null> {
  const hex: HexString = `0x${blockNumber.toString(16)}`;
  const raw = await provider.request<RpcBlock | null>("eth_getBlockByNumber", [
    hex,
    includeTransactions,
  ]);
  return raw !== null ? parseBlock(raw) : null;
}

export async function getBlockByTag(
  provider: Provider,
  tag: BlockTag,
  includeTransactions = false
): Promise<Block | null> {
  const raw = await provider.request<RpcBlock | null>("eth_getBlockByNumber", [
    tag,
    includeTransactions,
  ]);
  return raw !== null ? parseBlock(raw) : null;
}

export async function getBlockByHash(
  provider: Provider,
  blockHash: HexString,
  includeTransactions = false
): Promise<Block | null> {
  const raw = await provider.request<RpcBlock | null>("eth_getBlockByHash", [
    blockHash,
    includeTransactions,
  ]);
  return raw !== null ? parseBlock(raw) : null;
}

export async function getTransactionByHash(
  provider: Provider,
  txHash: HexString
): Promise<Transaction | null> {
  const raw = await provider.request<RpcTransactionResponse | null>(
    "eth_getTransactionByHash",
    [txHash]
  );
  return raw !== null ? parseTransaction(raw) : null;
}

export async function getTransactionReceipt(
  provider: Provider,
  txHash: HexString
): Promise<Receipt | null> {
  const raw = await provider.request<RpcReceipt | null>("eth_getTransactionReceipt", [txHash]);
  return raw !== null ? parseReceipt(raw) : null;
}

export async function getTransactionCount(
  provider: Provider,
  address: string,
  blockTag: BlockTag = "latest"
): Promise<number> {
  const hex = await provider.request<HexString>("eth_getTransactionCount", [address, blockTag]);
  return Number(hexToBigInt(hex));
}

export async function getCode(
  provider: Provider,
  address: string,
  blockTag: BlockTag = "latest"
): Promise<HexString> {
  return provider.request<HexString>("eth_getCode", [address, blockTag]);
}

export async function getStorageAt(
  provider: Provider,
  address: string,
  slot: HexString,
  blockTag: BlockTag = "latest"
): Promise<HexString> {
  return provider.request<HexString>("eth_getStorageAt", [address, slot, blockTag]);
}

export async function getGasPrice(provider: Provider): Promise<bigint> {
  const hex = await provider.request<HexString>("eth_gasPrice", []);
  return hexToBigInt(hex);
}

export async function getFeeHistory(
  provider: Provider,
  blockCount: number,
  newestBlock: BlockTag,
  rewardPercentiles: number[]
): Promise<{
  baseFeePerGas: readonly bigint[];
  gasUsedRatio: readonly number[];
  oldestBlock: bigint;
}> {
  const raw = await provider.request<{
    baseFeePerGas: HexString[];
    gasUsedRatio: number[];
    oldestBlock: HexString;
  }>("eth_feeHistory", [`0x${blockCount.toString(16)}`, newestBlock, rewardPercentiles]);

  return {
    baseFeePerGas: raw.baseFeePerGas.map(hexToBigInt),
    gasUsedRatio: raw.gasUsedRatio,
    oldestBlock: hexToBigInt(raw.oldestBlock),
  };
}

export async function estimateGas(
  provider: Provider,
  params: {
    from?: string;
    to: string;
    data?: HexString;
    value?: bigint;
  },
  blockTag: BlockTag = "latest"
): Promise<bigint> {
  const txParam: Record<string, unknown> = { to: params.to };
  if (params.from !== undefined) txParam["from"] = params.from;
  if (params.data !== undefined) txParam["data"] = params.data;
  if (params.value !== undefined) txParam["value"] = `0x${params.value.toString(16)}`;
  const hex = await provider.request<HexString>("eth_estimateGas", [txParam, blockTag]);
  return hexToBigInt(hex);
}

export async function getLogs(
  provider: Provider,
  filter: {
    fromBlock?: BlockTag;
    toBlock?: BlockTag;
    address?: string | readonly string[];
    topics?: ReadonlyArray<HexString | readonly HexString[] | null>;
  }
): Promise<HexString[]> {
  return provider.request<HexString[]>("eth_getLogs", [filter]);
}
