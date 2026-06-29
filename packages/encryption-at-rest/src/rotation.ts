// Key rotation: re-encrypts envelopes from an old KEK to a new KEK in a rotation plan.
import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { EncryptedEnvelope, KekId, RotationPlan, RotationResult } from "./types.js";
import type { KmsProvider } from "./provider.js";
import { envelopeReEncrypt } from "./envelope.js";
import { KeyRotationError } from "./errors.js";

/** Create a RotationPlan targeting an old KEK to be replaced by a new KEK. */
export function createRotationPlan(oldKekId: KekId, newKekId: KekId): RotationPlan {
  return { oldKekId, newKekId, initiatedAt: Date.now() };
}

/** Re-encrypt a single envelope according to a RotationPlan. */
export async function rotateEnvelope(
  envelope: EncryptedEnvelope,
  plan: RotationPlan,
  kms: KmsProvider,
): Promise<Result<RotationResult, KeyRotationError>> {
  if (envelope.kekId !== plan.oldKekId) {
    return err(
      new KeyRotationError(
        `Envelope KEK ${envelope.kekId} does not match plan old KEK ${plan.oldKekId}`,
      ),
    );
  }

  const reEncResult = await envelopeReEncrypt(envelope, plan.newKekId, kms);
  if (!reEncResult.ok) {
    return err(new KeyRotationError("Failed to re-encrypt envelope during rotation", reEncResult.error));
  }

  const result: RotationResult = {
    oldKekId: plan.oldKekId,
    newKekId: plan.newKekId,
    rotatedAt: Date.now(),
    newEnvelope: reEncResult.value,
  };

  return ok(result);
}

/** Re-encrypt a batch of envelopes according to a single RotationPlan.
 *  Partial failures are collected; successful rotations are returned alongside errors. */
export async function rotateBatch(
  envelopes: readonly EncryptedEnvelope[],
  plan: RotationPlan,
  kms: KmsProvider,
): Promise<{ successes: RotationResult[]; failures: Array<{ index: number; error: KeyRotationError }> }> {
  const successes: RotationResult[] = [];
  const failures: Array<{ index: number; error: KeyRotationError }> = [];

  for (let i = 0; i < envelopes.length; i++) {
    const envelope = envelopes[i];
    if (!envelope) continue;
    const result = await rotateEnvelope(envelope, plan, kms);
    if (result.ok) {
      successes.push(result.value);
    } else {
      failures.push({ index: i, error: result.error });
    }
  }

  return { successes, failures };
}

/** Validate a RotationPlan: ensures old and new KEK ids are distinct and present. */
export function validateRotationPlan(
  plan: RotationPlan,
  knownKekIds: readonly KekId[],
): Result<RotationPlan, KeyRotationError> {
  if (plan.oldKekId === plan.newKekId) {
    return err(new KeyRotationError("oldKekId and newKekId must be different"));
  }
  if (!knownKekIds.includes(plan.oldKekId)) {
    return err(new KeyRotationError(`Old KEK not found: ${plan.oldKekId}`));
  }
  if (!knownKekIds.includes(plan.newKekId)) {
    return err(new KeyRotationError(`New KEK not found: ${plan.newKekId}`));
  }
  return ok(plan);
}
