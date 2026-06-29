// Verify an attestation: check existence, revocation status, and schema match

import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { Attestation } from "./attestation.js";
import type { AttestationRegistry } from "./registry.js";
import { AttestationNotFoundError, AttestationRevokedError, SchemaNotFoundError } from "./errors.js";

export interface VerifyRequest {
  /** UID of the attestation to verify. */
  readonly uid: string;
  /** If provided, the attestation's schemaUid must match. */
  readonly expectedSchemaUid?: string;
  /** If provided, the attester address must match (case-insensitive). */
  readonly expectedAttester?: string;
}

export interface VerifyResult {
  readonly attestation: Attestation;
  readonly isValid: boolean;
  readonly reason?: string;
}

/** Verify an attestation against the registry and optional constraints. */
export class AttestationVerifier {
  constructor(private readonly registry: AttestationRegistry) {}

  async verify(req: VerifyRequest): Promise<Result<VerifyResult>> {
    const attestationResult = await this.registry.getAttestation(req.uid);
    if (!attestationResult.ok) {
      return err(new AttestationNotFoundError(req.uid));
    }

    const attestation = attestationResult.value;

    if (attestation.status === "revoked") {
      return ok({
        attestation,
        isValid: false,
        reason: "Attestation has been revoked",
      });
    }

    if (req.expectedSchemaUid !== undefined && attestation.schemaUid !== req.expectedSchemaUid) {
      return ok({
        attestation,
        isValid: false,
        reason: `Schema mismatch: expected ${req.expectedSchemaUid}, got ${attestation.schemaUid}`,
      });
    }

    if (
      req.expectedAttester !== undefined &&
      attestation.attester.toLowerCase() !== req.expectedAttester.toLowerCase()
    ) {
      return ok({
        attestation,
        isValid: false,
        reason: `Attester mismatch: expected ${req.expectedAttester}, got ${attestation.attester}`,
      });
    }

    const schemaResult = await this.registry.getSchema(attestation.schemaUid);
    if (!schemaResult.ok) {
      return err(new SchemaNotFoundError(attestation.schemaUid));
    }

    return ok({ attestation, isValid: true });
  }

  /** Convenience: return true only when the attestation passes all checks. */
  async isValid(uid: string, expectedSchemaUid?: string): Promise<boolean> {
    const result = await this.verify({ uid, expectedSchemaUid });
    return result.ok && result.value.isValid;
  }
}
