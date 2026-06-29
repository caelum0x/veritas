// Access certification: issue and track per-user certifications within a review campaign.

import { z } from "zod";
import {
  type Result, ok, err, newId, type Id, type IsoTimestamp, epochToIso, ValidationError,
} from "@veritas/core";
import type { ReviewId } from "./review.js";
import { CertificationNotFoundError, InvalidReviewStateError } from "./errors.js";

export type CertificationId = Id<"cert">;
export const newCertificationId = (): CertificationId => newId("cert");

export type CertificationStatus = "pending" | "certified" | "rejected" | "expired";

export const CreateCertificationSchema = z.object({
  reviewId: z.string().min(1),
  userId: z.string().min(1),
  reviewerId: z.string().min(1),
  entitlementIds: z.array(z.string().min(1)).min(1),
  expiresAt: z.string().datetime().optional(),
});

export type CreateCertification = z.infer<typeof CreateCertificationSchema>;

export interface AccessCertification {
  readonly id: CertificationId;
  readonly reviewId: ReviewId;
  readonly userId: string;
  readonly reviewerId: string;
  readonly entitlementIds: readonly string[];
  readonly status: CertificationStatus;
  readonly certifiedAt: IsoTimestamp | undefined;
  readonly expiresAt: IsoTimestamp | undefined;
  readonly rejectionReason: string | undefined;
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
}

export function createCertification(
  input: unknown,
): Result<AccessCertification, ValidationError> {
  const parsed = CreateCertificationSchema.safeParse(input);
  if (!parsed.success) {
    return err(new ValidationError({ message: "Invalid certification input", cause: parsed.error }));
  }

  const now = epochToIso(Date.now());
  const certification: AccessCertification = {
    id: newCertificationId(),
    reviewId: parsed.data.reviewId as ReviewId,
    userId: parsed.data.userId,
    reviewerId: parsed.data.reviewerId,
    entitlementIds: Object.freeze([...parsed.data.entitlementIds]),
    status: "pending",
    certifiedAt: undefined,
    expiresAt: parsed.data.expiresAt as IsoTimestamp | undefined,
    rejectionReason: undefined,
    createdAt: now,
    updatedAt: now,
  };

  return ok(certification);
}

export function certify(
  cert: AccessCertification,
): Result<AccessCertification, InvalidReviewStateError> {
  if (cert.status !== "pending") {
    return err(new InvalidReviewStateError(`Certification ${cert.id} is not pending`));
  }
  const now = epochToIso(Date.now());
  return ok({ ...cert, status: "certified", certifiedAt: now, updatedAt: now });
}

export function rejectCertification(
  cert: AccessCertification,
  reason: string,
): Result<AccessCertification, InvalidReviewStateError> {
  if (cert.status !== "pending") {
    return err(new InvalidReviewStateError(`Certification ${cert.id} is not pending`));
  }
  const now = epochToIso(Date.now());
  return ok({ ...cert, status: "rejected", rejectionReason: reason, updatedAt: now });
}

export function expireCertification(
  cert: AccessCertification,
  now: IsoTimestamp,
): Result<AccessCertification, CertificationNotFoundError> {
  if (!cert.expiresAt || cert.expiresAt > now) {
    return err(new CertificationNotFoundError(`Certification ${cert.id} is not expired`));
  }
  if (cert.status === "expired") {
    return ok(cert);
  }
  const ts = epochToIso(Date.now());
  return ok({ ...cert, status: "expired", updatedAt: ts });
}
