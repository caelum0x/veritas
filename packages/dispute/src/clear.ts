// CAP-clear vs dispute mapping: links CAP verifications to opened disputes.

import { type IsoTimestamp, ok, err } from "@veritas/core";
import type { Result, AppError } from "@veritas/core";
import type { VerificationId, ClaimId } from "@veritas/core";
import type { DisputeId } from "./types.js";
import type { DisputeReason } from "./reasons.js";

/** A dispute that originated from a CAP verification result the claimant contests. */
export type ClearDisputeLink = {
  readonly disputeId: DisputeId;
  readonly verificationId: VerificationId;
  readonly claimId: ClaimId;
  readonly reason: DisputeReason;
  readonly contestedVerdict: string;
  readonly linkedAt: IsoTimestamp;
};

/** In-memory store of CAP verification → dispute links (replaced by DB in prod). */
const links = new Map<string, ClearDisputeLink>();

export function linkVerificationToDispute(
  link: ClearDisputeLink,
): Result<ClearDisputeLink, AppError> {
  const key = `${link.verificationId}:${link.disputeId}`;
  if (links.has(key)) {
    return err({
      code: "CONFLICT",
      message: `Verification ${link.verificationId} is already linked to dispute ${link.disputeId}.`,
    } as AppError);
  }
  links.set(key, link);
  return ok(link);
}

export function findLinksByVerification(
  verificationId: VerificationId,
): readonly ClearDisputeLink[] {
  const result: ClearDisputeLink[] = [];
  for (const link of links.values()) {
    if (link.verificationId === verificationId) result.push(link);
  }
  return result;
}

export function findLinksByDispute(
  disputeId: DisputeId,
): readonly ClearDisputeLink[] {
  const result: ClearDisputeLink[] = [];
  for (const link of links.values()) {
    if (link.disputeId === disputeId) result.push(link);
  }
  return result;
}

export function removeLinksByDispute(disputeId: DisputeId): void {
  for (const [key, link] of links.entries()) {
    if (link.disputeId === disputeId) links.delete(key);
  }
}
