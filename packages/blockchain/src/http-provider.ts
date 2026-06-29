// Fetch-based JSON-RPC provider implementation over HTTP

import type { HexString } from "./hex.js";
import {
  Provider,
  ProviderError,
  type JsonRpcRequest,
  type JsonRpcResponse,
  isJsonRpcError,
  type CallParams,
  type BlockTag,
} from "./provider.js";
import { hexToBigInt } from "./hex.js";

let requestId = 0;

function nextId(): number {
  requestId = (requestId + 1) % Number.MAX_SAFE_INTEGER;
  return requestId;
}

export interface HttpProviderOptions {
  readonly url: string;
  readonly headers?: Readonly<Record<string, string>>;
  readonly timeoutMs?: number;
}

export class HttpProvider implements Provider {
  readonly #url: string;
  readonly #headers: Readonly<Record<string, string>>;
  readonly #timeoutMs: number;

  constructor(options: HttpProviderOptions) {
    this.#url = options.url;
    this.#headers = options.headers ?? {};
    this.#timeoutMs = options.timeoutMs ?? 30_000;
  }

  async request<T>(method: string, params: readonly unknown[] = []): Promise<T> {
    const body: JsonRpcRequest = {
      jsonrpc: "2.0",
      id: nextId(),
      method,
      params,
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.#timeoutMs);

    let rpcResponse: JsonRpcResponse<T>;
    try {
      const response = await fetch(this.#url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...this.#headers,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new ProviderError(`HTTP ${response.status}: ${response.statusText}`, -32000);
      }

      rpcResponse = (await response.json()) as JsonRpcResponse<T>;
    } catch (err: unknown) {
      if (err instanceof ProviderError) throw err;
      const message = err instanceof Error ? err.message : String(err);
      throw new ProviderError(`RPC request failed: ${message}`, -32000);
    } finally {
      clearTimeout(timer);
    }

    if (isJsonRpcError(rpcResponse)) {
      throw new ProviderError(
        rpcResponse.error.message,
        rpcResponse.error.code,
        rpcResponse.error.data
      );
    }

    return rpcResponse.result;
  }

  async getChainId(): Promise<number> {
    const hex = await this.request<HexString>("eth_chainId", []);
    return Number(hexToBigInt(hex));
  }

  async getBlockNumber(): Promise<bigint> {
    const hex = await this.request<HexString>("eth_blockNumber", []);
    return hexToBigInt(hex);
  }

  async getBalance(address: string, blockTag: BlockTag = "latest"): Promise<bigint> {
    const hex = await this.request<HexString>("eth_getBalance", [address, blockTag]);
    return hexToBigInt(hex);
  }

  async call(tx: CallParams, blockTag: BlockTag = "latest"): Promise<HexString> {
    const txParam: Record<string, unknown> = { to: tx.to };
    if (tx.data !== undefined) txParam["data"] = tx.data;
    if (tx.from !== undefined) txParam["from"] = tx.from;
    if (tx.value !== undefined) txParam["value"] = `0x${tx.value.toString(16)}`;
    if (tx.gas !== undefined) txParam["gas"] = `0x${tx.gas.toString(16)}`;
    return this.request<HexString>("eth_call", [txParam, blockTag]);
  }
}

export function createHttpProvider(options: HttpProviderOptions): HttpProvider {
  return new HttpProvider(options);
}
