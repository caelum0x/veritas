// Anchor a single Merkle root or report hash to an on-chain transaction

import { ok, err, epochToIso } from "@veritas/core";
import type { ContentHash, Result, IsoTimestamp } from "@veritas/core";
import { encodeContentHashData } from "./encoder.js";
import type { OnchainPort, TxReceipt } from "./onchain-port.js";
import type { HexString, EvmAddress } from "@veritas/blockchain";

export interface AnchorRequest {
  /** The root hash to anchor (Merkle root or single report hash). */
  readonly root: ContentHash;
  /** Target contract address on-chain. */
  readonly contractAddress: EvmAddress;
}

export interface AnchorResult {
  readonly txHash: HexString;
  readonly root: ContentHash;
  readonly blockNumber: bigint;
  readonly anchoredAt: IsoTimestamp;
}

export class Anchor {
  constructor(private readonly chain: OnchainPort) {}

  async anchorRoot(req: AnchorRequest): Promise<Result<AnchorResult>> {
    const data = encodeContentHashData(req.root);

    const submitResult = await this.chain.sendTransaction({
      to: req.contractAddress,
      data,
    });

    if (!submitResult.ok) return err(submitResult.error);

    const receipt: TxReceipt = submitResult.value;

    if (receipt.status === "reverted") {
      return err(new Error(`Anchor transaction reverted: ${receipt.txHash}`));
    }

    return ok({
      txHash: receipt.txHash,
      root: req.root,
      blockNumber: receipt.blockNumber,
      anchoredAt: epochToIso(Date.now()),
    });
  }
}
