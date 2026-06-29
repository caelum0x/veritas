// JSON-RPC provider interface for EVM chain communication

import type { HexString } from "./hex.js";

export interface JsonRpcRequest {
  readonly jsonrpc: "2.0";
  readonly id: number;
  readonly method: string;
  readonly params: readonly unknown[];
}

export interface JsonRpcSuccess<T> {
  readonly jsonrpc: "2.0";
  readonly id: number;
  readonly result: T;
}

export interface JsonRpcError {
  readonly jsonrpc: "2.0";
  readonly id: number;
  readonly error: { readonly code: number; readonly message: string; readonly data?: unknown };
}

export type JsonRpcResponse<T> = JsonRpcSuccess<T> | JsonRpcError;

export function isJsonRpcError<T>(res: JsonRpcResponse<T>): res is JsonRpcError {
  return "error" in res;
}

export interface Provider {
  request<T>(method: string, params?: readonly unknown[]): Promise<T>;
  getChainId(): Promise<number>;
  getBlockNumber(): Promise<bigint>;
  getBalance(address: string, blockTag?: BlockTag): Promise<bigint>;
  call(tx: CallParams, blockTag?: BlockTag): Promise<HexString>;
}

export interface CallParams {
  readonly to: string;
  readonly data?: HexString;
  readonly from?: string;
  readonly value?: bigint;
  readonly gas?: bigint;
}

export type BlockTag = "latest" | "earliest" | "pending" | "safe" | "finalized" | HexString;

export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly code: number,
    public readonly data?: unknown
  ) {
    super(message);
    this.name = "ProviderError";
  }
}
