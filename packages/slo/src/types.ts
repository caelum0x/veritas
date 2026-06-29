// Shared primitive types and value objects for the SLO module.
import { z } from "zod";

/** Ratio in [0, 1] representing a fraction of good events over total events. */
export const RatioSchema = z.number().min(0).max(1);
export type Ratio = z.infer<typeof RatioSchema>;

/** Non-negative count of events. */
export const EventCountSchema = z.number().int().nonnegative();
export type EventCount = z.infer<typeof EventCountSchema>;

/** Duration in milliseconds (positive integer). */
export const DurationMsSchema = z.number().int().positive();
export type DurationMs = z.infer<typeof DurationMsSchema>;

/** Unix epoch timestamp in milliseconds. */
export const EpochMsSchema = z.number().int().nonnegative();
export type EpochMs = z.infer<typeof EpochMsSchema>;

/** Burn rate: how fast the error budget is being consumed (dimensionless multiplier). */
export const BurnRateSchema = z.number().nonnegative();
export type BurnRate = z.infer<typeof BurnRateSchema>;

/** Alert severity level. */
export const AlertSeveritySchema = z.enum(["page", "ticket", "info"]);
export type AlertSeverity = z.infer<typeof AlertSeveritySchema>;

/** Observation sample: a snapshot of good/total event counts in a window. */
export const ObservationSchema = z.object({
  windowStartMs: EpochMsSchema,
  windowEndMs: EpochMsSchema,
  goodEvents: EventCountSchema,
  totalEvents: EventCountSchema,
});
export type Observation = z.infer<typeof ObservationSchema>;

/** Named burn-rate window configuration used in multi-window alerting. */
export const BurnWindowSchema = z.object({
  name: z.string().min(1),
  durationMs: DurationMsSchema,
  burnRateThreshold: BurnRateSchema,
  severity: AlertSeveritySchema,
});
export type BurnWindow = z.infer<typeof BurnWindowSchema>;

/** Compact summary row used in SLO report listings. */
export const SloSummarySchema = z.object({
  sloId: z.string(),
  sloName: z.string(),
  targetRatio: RatioSchema,
  currentRatio: RatioSchema,
  errorBudgetRemaining: RatioSchema,
  withinTarget: z.boolean(),
  evaluatedAt: z.string(),
});
export type SloSummary = z.infer<typeof SloSummarySchema>;
