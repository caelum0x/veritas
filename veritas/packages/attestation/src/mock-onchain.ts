// In-memory mock implementation of OnchainPort for testing and local development.

import { ok } from "@veritas/core";
import { asEvmAddress } from "@veritas/blockchain";
import type { OnchainPort, AttestTxParams, TxReceipt } from "./onchain-port.js";
import type { HexString, TxHash } from "@veritas/blockchain";

const MOCK_SIGNER = asEvmAddress("0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef");

function fakeTxHash(nonce: number): TxHash {
  const hex = nonce.toString(16).padStart(64, "0");
  return `0x${hex}` as TxHash;
}

function fakeBlockHash(block: bigint): HexString {
  const hex = block.toString(16).padStart(64, "0");
  return `0x${hex}` as HexString;
}

/** Mock OnchainPort that records submitted transactions in memory. */
export class MockOnchainPort implements OnchainPort {
  private nonce = 0;
  private block = 1000n;

  /** All receipts produced so far, keyed by tx hash. */
  readonly receipts = new Map<TxHash, TxReceipt>();

  async sendTransaction(params: AttestTxParams): Promise<ReturnType<typeof ok<TxReceipt>>> {
    this.nonce += 1;
    this.block += 1n;

    const txHash = fakeTxHash(this.nonce);
    const receipt: TxReceipt = {
      txHash,
      blockNumber: this.block,
      blockHash: fakeBlockHash(this.block),
      status: "success",
      gasUsed: 21000n + BigInt(params.data.length) * 16n,
    };

    this.receipts.set(txHash, receipt);
    return ok(receipt);
  }

  async signerAddress(): Promise<typeof MOCK_SIGNER> {
    return MOCK_SIGNER;
  }

  /** Reset state between tests. */
  reset(): void {
    this.nonce = 0;
    this.block = 1000n;
    this.receipts.clear();
  }
}
