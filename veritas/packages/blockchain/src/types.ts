// Shared type aliases and composite interfaces for the @veritas/blockchain package

import type { HexString } from "./hex.js";
import type { EvmAddress } from "./address.js";
import type { Wei } from "./units.js";
import type { BlockTag } from "./provider.js";

/** A block number represented as a bigint */
export type BlockNumber = bigint;

/** A transaction hash as a 0x-prefixed hex string */
export type TxHash = HexString;

/** A block hash as a 0x-prefixed hex string */
export type BlockHash = HexString;

/** Raw EVM block header fields returned from eth_getBlockByNumber */
export interface BlockHeader {
  readonly hash: BlockHash;
  readonly number: BlockNumber;
  readonly parentHash: BlockHash;
  readonly timestamp: bigint;
  readonly gasLimit: bigint;
  readonly gasUsed: bigint;
  readonly baseFeePerGas: bigint | undefined;
  readonly miner: EvmAddress;
}

/** Minimal transaction fields returned from eth_getTransactionByHash */
export interface TransactionView {
  readonly hash: TxHash;
  readonly from: EvmAddress;
  readonly to: EvmAddress | undefined;
  readonly value: Wei;
  readonly gasPrice: bigint | undefined;
  readonly maxFeePerGas: bigint | undefined;
  readonly maxPriorityFeePerGas: bigint | undefined;
  readonly gas: bigint;
  readonly nonce: number;
  readonly input: HexString;
  readonly blockNumber: BlockNumber | undefined;
  readonly blockHash: BlockHash | undefined;
}

/** Transaction receipt fields returned from eth_getTransactionReceipt */
export interface TransactionReceipt {
  readonly transactionHash: TxHash;
  readonly blockNumber: BlockNumber;
  readonly blockHash: BlockHash;
  readonly from: EvmAddress;
  readonly to: EvmAddress | undefined;
  readonly contractAddress: EvmAddress | undefined;
  readonly gasUsed: bigint;
  readonly effectiveGasPrice: bigint;
  readonly status: "success" | "reverted";
  readonly logs: readonly Log[];
}

/** An EVM event log entry */
export interface Log {
  readonly address: EvmAddress;
  readonly topics: readonly HexString[];
  readonly data: HexString;
  readonly blockNumber: BlockNumber;
  readonly blockHash: BlockHash;
  readonly transactionHash: TxHash;
  readonly transactionIndex: number;
  readonly logIndex: number;
}

/** Parameters for a read-only contract call */
export interface CallRequest {
  readonly to: EvmAddress;
  readonly data: HexString;
  readonly from?: EvmAddress;
  readonly value?: Wei;
  readonly blockTag?: BlockTag;
}

/** Parameters for estimating gas on a transaction */
export interface GasEstimateRequest {
  readonly to: EvmAddress;
  readonly data?: HexString;
  readonly from?: EvmAddress;
  readonly value?: Wei;
}

/** Gas price parameters for EIP-1559 transactions */
export interface FeeData {
  readonly maxFeePerGas: bigint;
  readonly maxPriorityFeePerGas: bigint;
  readonly baseFeePerGas: bigint;
}

/** A decoded ERC-20 Transfer event */
export interface Erc20Transfer {
  readonly from: EvmAddress;
  readonly to: EvmAddress;
  readonly amount: bigint;
  readonly txHash: TxHash;
  readonly blockNumber: BlockNumber;
  readonly logIndex: number;
}
