// Publish a report content-hash on-chain as an EAS-style attestation via OnchainPort

import { ok, err, isErr, type Result } from "@veritas/core";
import type { ContentHash } from "@veritas/core";
import type { HexString } from "@veritas/blockchain";
import type { OnchainPort } from "./onchain-port.js";
import { buildAttestationPayload, serializePayload } from "./encoder.js";
import { AttestationPublishError } from "./errors.js";

/** Parameters for publishing a single report hash on-chain */
export interface PublishParams {
  /** EAS schema UID to use for this attestation */
  readonly schemaUid: HexString;
  /** Address of the EAS registry contract */
  readonly registryAddress: string;
  /** SHA-256 content hash of the report */
  readonly reportHash: ContentHash;
  /** Optional recipient address (defaults to zero address) */
  readonly recipient?: string;
  /** Whether the attestation can be revoked later */
  readonly revocable?: boolean;
  /** Optional expiration as unix timestamp (0 = no expiry) */
  readonly expirationTime?: bigint;
}

/** Result of a successful on-chain publish */
export interface PublishResult {
  readonly txHash: HexString;
  readonly blockNumber: bigint;
  readonly schemaUid: HexString;
  readonly reportHash: ContentHash;
  readonly publishedAt: number;
}

/** Publisher: submits a report hash to an EAS-compatible on-chain registry */
export class AttestationPublisher {
  constructor(private readonly chain: OnchainPort) {}

  async publish(params: PublishParams): Promise<Result<PublishResult>> {
    const recipient = params.recipient ?? "0x0000000000000000000000000000000000000000";

    const payload = buildAttestationPayload({
      schemaUid: params.schemaUid,
      recipient,
      contentHash: params.reportHash,
      revocable: params.revocable ?? true,
      expirationTime: params.expirationTime ?? 0n,
    });

    const calldata = serializePayload(payload);

    const txResult = await this.chain.sendTransaction({
      to: params.registryAddress as Parameters<OnchainPort["sendTransaction"]>[0]["to"],
      data: calldata,
    });

    if (isErr(txResult)) {
      return err(
        new AttestationPublishError(
          txResult.error instanceof Error ? txResult.error.message : String(txResult.error)
        )
      );
    }

    const receipt = txResult.value;

    if (receipt.status === "reverted") {
      return err(new AttestationPublishError("transaction reverted on-chain"));
    }

    return ok({
      txHash: receipt.txHash,
      blockNumber: receipt.blockNumber,
      schemaUid: params.schemaUid,
      reportHash: params.reportHash,
      publishedAt: Math.floor(Date.now() / 1000),
    });
  }
}
