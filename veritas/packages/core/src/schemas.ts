// Reusable zod schemas for core branded/value types.

import { z } from "zod";
import { isContentHash } from "./hashing.js";
import { isIsoTimestamp } from "./iso.js";
import { Verdict, OrderStatus, JobStatus, SourceTier } from "./enums.js";

/** ISO-8601 timestamp string schema. */
export const isoTimestampSchema = z
  .string()
  .refine(isIsoTimestamp, { message: "Invalid ISO-8601 timestamp" });

/** "sha256:<hex>" content hash schema. */
export const contentHashSchema = z
  .string()
  .refine(isContentHash, { message: "Invalid content hash" });

/** Score in the unit interval [0, 1]. */
export const scoreSchema = z.number().min(0).max(1);

/** Verdict enum schema. */
export const verdictSchema = z.enum([
  Verdict.SUPPORTED,
  Verdict.REFUTED,
  Verdict.UNVERIFIABLE,
]);

/** OrderStatus enum schema. */
export const orderStatusSchema = z.enum([
  OrderStatus.PENDING,
  OrderStatus.PAID,
  OrderStatus.FULFILLED,
  OrderStatus.REFUNDED,
  OrderStatus.CANCELLED,
  OrderStatus.FAILED,
]);

/** JobStatus enum schema. */
export const jobStatusSchema = z.enum([
  JobStatus.QUEUED,
  JobStatus.RUNNING,
  JobStatus.SUCCEEDED,
  JobStatus.FAILED,
  JobStatus.CANCELLED,
]);

/** SourceTier enum schema. */
export const sourceTierSchema = z.enum([
  SourceTier.PRIMARY,
  SourceTier.SECONDARY,
  SourceTier.TERTIARY,
  SourceTier.UNKNOWN,
]);

/** USDC base-unit amount as a stringified integer. */
export const usdcBaseUnitsSchema = z
  .string()
  .regex(/^-?\d+$/, { message: "USDC base units must be an integer string" });
