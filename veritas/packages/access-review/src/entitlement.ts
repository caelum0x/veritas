// Entitlement: represents a user's access right that must be reviewed in a campaign.

import { z } from "zod";
import {
  type Result, ok, err, newId, type Id, type UserId, type IsoTimestamp, epochToIso, ValidationError,
} from "@veritas/core";
import type { ReviewId } from "./review.js";
import { EntitlementNotFoundError } from "./errors.js";

export type EntitlementId = Id<"entl">;
export const newEntitlementId = (): EntitlementId => newId("entl");

export type EntitlementKind = "role" | "permission" | "resource_access" | "group_membership";
export type EntitlementStatus = "active" | "revoked" | "expired";

export const CreateEntitlementSchema = z.object({
  reviewId: z.string().min(1),
  userId: z.string().min(1),
  kind: z.enum(["role", "permission", "resource_access", "group_membership"]),
  resourceId: z.string().min(1),
  resourceName: z.string().min(1).max(300),
  grantedAt: z.string().datetime(),
  expiresAt: z.string().datetime().optional(),
  metadata: z.record(z.string()).optional(),
});

export type CreateEntitlement = z.infer<typeof CreateEntitlementSchema>;

export interface Entitlement {
  readonly id: EntitlementId;
  readonly reviewId: ReviewId;
  readonly userId: string;
  readonly kind: EntitlementKind;
  readonly resourceId: string;
  readonly resourceName: string;
  readonly status: EntitlementStatus;
  readonly grantedAt: IsoTimestamp;
  readonly expiresAt: IsoTimestamp | undefined;
  readonly metadata: Readonly<Record<string, string>>;
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
}

export function createEntitlement(
  input: unknown,
): Result<Entitlement, ValidationError> {
  const parsed = CreateEntitlementSchema.safeParse(input);
  if (!parsed.success) {
    return err(new ValidationError({ message: "Invalid entitlement input", cause: parsed.error }));
  }

  const now = epochToIso(Date.now());
  const entitlement: Entitlement = {
    id: newEntitlementId(),
    reviewId: parsed.data.reviewId as ReviewId,
    userId: parsed.data.userId,
    kind: parsed.data.kind,
    resourceId: parsed.data.resourceId,
    resourceName: parsed.data.resourceName,
    status: "active",
    grantedAt: parsed.data.grantedAt as IsoTimestamp,
    expiresAt: parsed.data.expiresAt as IsoTimestamp | undefined,
    metadata: Object.freeze({ ...parsed.data.metadata }),
    createdAt: now,
    updatedAt: now,
  };

  return ok(entitlement);
}

export function revokeEntitlement(
  entitlement: Entitlement,
): Result<Entitlement, EntitlementNotFoundError> {
  if (entitlement.status === "revoked") {
    return err(new EntitlementNotFoundError(entitlement.id));
  }

  const now = epochToIso(Date.now());
  return ok({ ...entitlement, status: "revoked", updatedAt: now });
}

export function isEntitlementExpired(entitlement: Entitlement, now: IsoTimestamp): boolean {
  if (!entitlement.expiresAt) return false;
  return entitlement.expiresAt <= now;
}
