// Shared field schemas reused across every entity contract.

import { z } from "zod";
import {
  isoTimestampSchema,
  contentHashSchema,
  scoreSchema,
  usdcBaseUnitsSchema,
} from "@veritas/core";

/** Prefixed id schema factory (e.g. idSchema("claim") accepts "claim_..."). */
export function idSchema(prefix: string) {
  return z
    .string()
    .min(prefix.length + 2)
    .refine((v) => v.startsWith(`${prefix}_`), {
      message: `Expected id with prefix "${prefix}_"`,
    });
}

/** Generic non-prefixed id (opaque string identifier). */
export const opaqueIdSchema = z.string().min(1);

/** Re-exported ISO-8601 timestamp schema. */
export const timestampSchema = isoTimestampSchema;

/** Re-exported content hash schema. */
export const hashSchema = contentHashSchema;

/** Confidence/score in the unit interval [0, 1]. */
export const confidenceSchema = scoreSchema;

/** Trust score expressed on a 0-100 scale. */
export const trustScoreSchema = z.number().min(0).max(100);

/** Created/updated timestamp pair embedded in persisted entities. */
export const timestampsSchema = z.object({
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});
export type Timestamps = z.infer<typeof timestampsSchema>;

/** Monetary amount denominated in USDC base units (integer string). */
export const moneySchema = z.object({
  currency: z.literal("USDC"),
  amount: usdcBaseUnitsSchema,
});
export type Money = z.infer<typeof moneySchema>;

/** Cursor-based pagination request schema. */
export const paginationSchema = z.object({
  limit: z.number().int().min(1).max(100).optional(),
  cursor: z.string().min(1).optional(),
});
export type Pagination = z.infer<typeof paginationSchema>;

/** Arbitrary JSON-safe metadata bag. */
export const metadataSchema = z.record(z.string(), z.unknown());
export type Metadata = z.infer<typeof metadataSchema>;

/** A non-empty, trimmed string. */
export const nonEmptyString = z.string().trim().min(1);

/** An absolute http(s) URL string. */
export const urlSchema = z.string().url();
