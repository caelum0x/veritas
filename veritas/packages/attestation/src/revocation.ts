// Revoke attestations via the registry, with optional on-chain confirmation

import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { Attestation } from "./attestation.js";
import type { AttestationRegistry } from "./registry.js";
import type { OnchainPort } from "./onchain-port.js";
import { encodeStringData } from "./encoder.js";
import { AttestationNotFoundError, AttestationRevokedError, AttestationPublishError } from "./errors.js";
import type { EvmAddress } from "@veritas/blockchain";

export interface RevokeRequest {
  /** UID of the attestation to revoke. */
  readonly uid: string;
  /** Address of the entity performing the revocation. */
  readonly revoker: string;
  /** Optional: submit an on-chain revocation tx before updating the registry. */
  readonly contractAddress?: EvmAddress;
}

export interface RevokeResult {
  readonly attestation: Attestation;
  /** Present when an on-chain tx was submitted. */
  readonly txHash?: string;
}

/** Revoke attestations; optionally broadcasts a revocation tx on-chain first. */
export class RevocationService {
  constructor(
    private readonly registry: AttestationRegistry,
    private readonly chain: OnchainPort | undefined,
  ) {}

  async revoke(req: RevokeRequest): Promise<Result<RevokeResult>> {
    // Fetch the attestation first to verify it exists and is active.
    const existing = await this.registry.getAttestation(req.uid);
    if (!existing.ok) {
      return err(new AttestationNotFoundError(req.uid));
    }

    if (existing.value.status === "revoked") {
      return err(new AttestationRevokedError(req.uid));
    }

    let txHash: string | undefined;

    // Submit on-chain revocation tx when a port and contract address are provided.
    if (this.chain !== undefined && req.contractAddress !== undefined) {
      const data = encodeStringData(req.uid);
      const txResult = await this.chain.sendTransaction({
        to: req.contractAddress,
        data,
      });

      if (!txResult.ok) {
        return err(
          new AttestationPublishError(
            txResult.error instanceof Error ? txResult.error.message : String(txResult.error),
          ),
        );
      }

      if (txResult.value.status === "reverted") {
        return err(
          new AttestationPublishError(`Revocation tx reverted: ${txResult.value.txHash}`),
        );
      }

      txHash = txResult.value.txHash;
    }

    // Persist the revocation in the registry.
    const revokeResult = await this.registry.revoke(req.uid, req.revoker);
    if (!revokeResult.ok) {
      return err(revokeResult.error);
    }

    return ok({ attestation: revokeResult.value, txHash });
  }
}
