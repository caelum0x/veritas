// Port interface and mock for submitting a Merkle-root anchor transaction on-chain.

import { ok, err, epochToIso } from "@veritas/core";
import type { ContentHash, Result, IsoTimestamp } from "@veritas/core";
import type { HexString } from "@veritas/blockchain";

export interface AnchorTxRequest {
  readonly merkleRoot: ContentHash;
  /** On-chain contract that records the root. */
  readonly contractAddress: string;
  readonly chainId: number;
}

export interface AnchorTxReceipt {
  readonly txHash: HexString;
  readonly blockNumber: bigint;
  readonly status: "success" | "reverted";
  readonly anchoredAt: IsoTimestamp;
  readonly chainId: number;
}

/** Port for submitting a Merkle root to an on-chain anchor contract. */
export interface AnchorSubmitPort {
  submit(req: AnchorTxRequest): Promise<Result<AnchorTxReceipt>>;
}

/** In-memory mock AnchorSubmitPort for local development and tests. */
export class MockAnchorSubmitPort implements AnchorSubmitPort {
  private nonce = 0;
  private block = 5000n;

  /** Captured requests for inspection. */
  readonly submitted: AnchorTxRequest[] = [];

  /** When set, the next submit call will return an err. */
  simulateError: string | undefined = undefined;

  async submit(req: AnchorTxRequest): Promise<Result<AnchorTxReceipt>> {
    this.submitted.push(req);

    if (this.simulateError !== undefined) {
      return err(new Error(this.simulateError));
    }

    this.nonce += 1;
    this.block += 1n;

    const hex = this.nonce.toString(16).padStart(64, "0");
    const txHash = `0x${hex}` as HexString;

    return ok({
      txHash,
      blockNumber: this.block,
      status: "success",
      anchoredAt: epochToIso(Date.now()),
      chainId: req.chainId,
    });
  }

  reset(): void {
    this.nonce = 0;
    this.block = 5000n;
    this.submitted.length = 0;
    this.simulateError = undefined;
  }
}
