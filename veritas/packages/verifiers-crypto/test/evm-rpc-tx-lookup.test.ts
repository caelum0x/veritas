// Unit tests for the EVM JSON-RPC transaction lookup, using an injected fetch
// (no network). The stub routes by JSON-RPC method name.
import { test } from "node:test";
import assert from "node:assert/strict";
import { isOk } from "@veritas/core";
import { EvmRpcTxLookup } from "../src/sources/evm-rpc-tx-lookup.js";

const TX_HASH = "0x5c504ed432cb51138bcf09aa5e8a410dd4a1e204ef84bfed1be16dfba1b22060";

const TX = {
  hash: TX_HASH,
  from: "0xa1e4380a3b1f749673e270229993ee55f35663b4",
  to: "0x5df9b87991262f6ba471f09758cde1c0fc1de734",
  value: "0x7a69", // 31337 wei
  blockNumber: "0xb443",
};
const RECEIPT = { status: "0x1", gasUsed: "0x5208" };
const BLOCK = { timestamp: "0x55c42659" }; // 2015-08-07T03:30:33Z

/** Route JSON-RPC POSTs by method; missing tx returns null. */
function rpcStub(overrides: { tx?: unknown } = {}): typeof fetch {
  return (async (_url: string, init?: { body?: string }) => {
    const method = JSON.parse(init?.body ?? "{}").method as string;
    const result =
      method === "eth_getTransactionByHash"
        ? "tx" in overrides
          ? overrides.tx
          : TX
        : method === "eth_getTransactionReceipt"
          ? RECEIPT
          : method === "eth_getBlockByNumber"
            ? BLOCK
            : null;
    return { ok: true, status: 200, json: async () => ({ jsonrpc: "2.0", id: 1, result }) };
  }) as unknown as typeof fetch;
}

test("lookupTx assembles a TxRecord from tx, receipt and block", async () => {
  const src = new EvmRpcTxLookup({ fetchImpl: rpcStub() });
  const result = await src.lookupTx(TX_HASH, 1);
  assert.ok(isOk(result));
  if (!isOk(result)) return;
  assert.equal(result.value.from, TX.from);
  assert.equal(result.value.to, TX.to);
  assert.equal(result.value.valueEth, "0.000000000000031337");
  assert.equal(result.value.status, "success");
  assert.equal(result.value.chainName, "ethereum");
  assert.equal(result.value.gasUsed, 21_000);
  assert.equal(result.value.blockTimestamp, "2015-08-07T03:30:33.000Z");
});

test("lookupTx returns Err when the transaction is unknown", async () => {
  const src = new EvmRpcTxLookup({ fetchImpl: rpcStub({ tx: null }) });
  const result = await src.lookupTx(TX_HASH, 1);
  assert.equal(isOk(result), false);
});

test("lookupTx returns Err for an unconfigured chain", async () => {
  const src = new EvmRpcTxLookup({ fetchImpl: rpcStub() });
  const result = await src.lookupTx(TX_HASH, 999_999);
  assert.equal(isOk(result), false);
});

test("search extracts a tx hash from keywords and returns one document", async () => {
  const src = new EvmRpcTxLookup({ fetchImpl: rpcStub() });
  const result = await src.search({ keywords: [`tx ${TX_HASH} here`], maxResults: 5 });
  assert.ok(isOk(result));
  if (!isOk(result)) return;
  assert.equal(result.value.length, 1);
  assert.equal(result.value[0]!.metadata["from"], TX.from);
});

test("search returns no documents when no hash is present", async () => {
  const src = new EvmRpcTxLookup({ fetchImpl: rpcStub() });
  const result = await src.search({ keywords: ["no hash in here"], maxResults: 5 });
  assert.ok(isOk(result));
  if (!isOk(result)) return;
  assert.equal(result.value.length, 0);
});

test("listAddressTxs is unsupported over public RPC and returns Err", async () => {
  const src = new EvmRpcTxLookup({ fetchImpl: rpcStub() });
  const result = await src.listAddressTxs(TX.from, 1, 10);
  assert.equal(isOk(result), false);
});
