// Legal hold management: freeze records from purge during litigation or investigation.
import { z } from "zod";
import { newId } from "@veritas/core";

export const LegalHoldStatusSchema = z.enum(["active", "released", "expired"]);
export type LegalHoldStatus = z.infer<typeof LegalHoldStatusSchema>;

export const LegalHoldSchema = z.object({
  id: z.string(),
  /** Human-readable reason for the hold (case number, investigation ID, etc.). */
  reason: z.string().min(1),
  /** User or system actor who placed the hold. */
  placedBy: z.string().min(1),
  status: LegalHoldStatusSchema.default("active"),
  /** Categories of records covered by this hold. */
  categories: z.array(z.string()).min(1),
  /** Specific record IDs covered (empty = all records in the categories). */
  recordIds: z.array(z.string()).default([]),
  /** ISO timestamp when the hold was placed. */
  placedAt: z.string(),
  /** ISO timestamp when the hold was released, null if still active. */
  releasedAt: z.string().nullable().default(null),
  /** Optional ISO timestamp when the hold automatically expires. */
  expiresAt: z.string().nullable().default(null),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type LegalHold = z.infer<typeof LegalHoldSchema>;

export const CreateLegalHoldSchema = LegalHoldSchema.omit({
  id: true,
  status: true,
  placedAt: true,
  releasedAt: true,
  createdAt: true,
  updatedAt: true,
}).partial({ recordIds: true, expiresAt: true });
export type CreateLegalHold = z.infer<typeof CreateLegalHoldSchema>;

/** Build a new active LegalHold from a creation DTO. */
export function makeLegalHold(dto: CreateLegalHold): LegalHold {
  const now = new Date().toISOString();
  return LegalHoldSchema.parse({
    recordIds: [],
    expiresAt: null,
    ...dto,
    id: newId("hold"),
    status: "active",
    placedAt: now,
    releasedAt: null,
    createdAt: now,
    updatedAt: now,
  });
}

/** Return a hold with status set to released and releasedAt stamped. */
export function releaseLegalHold(hold: LegalHold): LegalHold {
  const now = new Date().toISOString();
  return { ...hold, status: "released", releasedAt: now, updatedAt: now };
}

/** Return a hold with status set to expired. */
export function expireLegalHold(hold: LegalHold): LegalHold {
  return { ...hold, status: "expired", updatedAt: new Date().toISOString() };
}

/** Determine whether a record is protected by any active legal hold. */
export function isUnderLegalHold(
  holds: ReadonlyArray<LegalHold>,
  category: string,
  recordId: string,
  nowIso: string,
): boolean {
  return holds.some((hold) => {
    if (hold.status !== "active") return false;
    if (hold.expiresAt !== null && hold.expiresAt <= nowIso) return false;
    if (!hold.categories.includes(category)) return false;
    if (hold.recordIds.length > 0 && !hold.recordIds.includes(recordId)) return false;
    return true;
  });
}

/** Evaluate and expire holds whose expiresAt has passed. */
export function applyHoldExpirations(
  holds: ReadonlyArray<LegalHold>,
  nowIso: string,
): ReadonlyArray<LegalHold> {
  return holds.map((hold) => {
    if (
      hold.status === "active" &&
      hold.expiresAt !== null &&
      hold.expiresAt <= nowIso
    ) {
      return expireLegalHold(hold);
    }
    return hold;
  });
}
