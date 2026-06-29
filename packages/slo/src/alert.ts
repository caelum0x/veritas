// Multi-window burn-rate alert: fires when error budget is burning too fast across short and long windows.
import { z } from "zod";
import { newId } from "@veritas/core";
import { type BurnRate } from "./burn-rate.js";

/** Alert severity based on how many windows are breaching their burn rate threshold. */
export const AlertSeveritySchema = z.enum(["page", "ticket", "none"]);
export type AlertSeverity = z.infer<typeof AlertSeveritySchema>;

export const BurnAlertConfigSchema = z.object({
  /** Long-window duration in ms (e.g. 1 hour = 3_600_000). */
  longWindowMs: z.number().int().positive(),
  /** Short-window duration in ms (e.g. 5 min = 300_000). */
  shortWindowMs: z.number().int().positive(),
  /** Burn-rate multiplier threshold for the long window (e.g. 14.4 means 1-hour burn). */
  longWindowBurnRateThreshold: z.number().positive(),
  /** Burn-rate multiplier threshold for the short window (must be same or higher). */
  shortWindowBurnRateThreshold: z.number().positive(),
  /** Severity to emit when both thresholds are breached. */
  severity: AlertSeveritySchema,
});
export type BurnAlertConfig = z.infer<typeof BurnAlertConfigSchema>;

export const BurnAlertEventSchema = z.object({
  id: z.string(),
  sloId: z.string(),
  severity: AlertSeveritySchema,
  longWindowBurnRate: z.number(),
  shortWindowBurnRate: z.number(),
  longWindowThreshold: z.number(),
  shortWindowThreshold: z.number(),
  errorBudgetConsumedRatio: z.number(),
  firedAt: z.string(),
});
export type BurnAlertEvent = z.infer<typeof BurnAlertEventSchema>;

/** Standard Google-style multi-window alert configs (2%, 5%, 10% budget consumption targets). */
export const STANDARD_BURN_ALERT_CONFIGS: readonly BurnAlertConfig[] = Object.freeze([
  {
    longWindowMs: 3_600_000,        // 1h
    shortWindowMs: 300_000,          // 5m
    longWindowBurnRateThreshold: 14.4,
    shortWindowBurnRateThreshold: 14.4,
    severity: "page",
  },
  {
    longWindowMs: 21_600_000,       // 6h
    shortWindowMs: 1_800_000,        // 30m
    longWindowBurnRateThreshold: 6,
    shortWindowBurnRateThreshold: 6,
    severity: "page",
  },
  {
    longWindowMs: 86_400_000,       // 24h
    shortWindowMs: 7_200_000,        // 2h
    longWindowBurnRateThreshold: 3,
    shortWindowBurnRateThreshold: 3,
    severity: "ticket",
  },
  {
    longWindowMs: 259_200_000,      // 72h
    shortWindowMs: 21_600_000,       // 6h
    longWindowBurnRateThreshold: 1,
    shortWindowBurnRateThreshold: 1,
    severity: "ticket",
  },
]);

export interface MultiWindowBurnRates {
  readonly longWindow: BurnRate;
  readonly shortWindow: BurnRate;
}

/**
 * Evaluate one burn alert config against observed burn rates.
 * Both windows must exceed their threshold for the alert to fire.
 */
export function evaluateBurnAlert(
  sloId: string,
  config: BurnAlertConfig,
  rates: MultiWindowBurnRates,
  errorBudgetConsumedRatio: number,
  nowMs: number,
): BurnAlertEvent | null {
  const longBreached = rates.longWindow.burnRate >= config.longWindowBurnRateThreshold;
  const shortBreached = rates.shortWindow.burnRate >= config.shortWindowBurnRateThreshold;

  if (!longBreached || !shortBreached) return null;

  return Object.freeze({
    id: newId("bale"),
    sloId,
    severity: config.severity,
    longWindowBurnRate: rates.longWindow.burnRate,
    shortWindowBurnRate: rates.shortWindow.burnRate,
    longWindowThreshold: config.longWindowBurnRateThreshold,
    shortWindowThreshold: config.shortWindowBurnRateThreshold,
    errorBudgetConsumedRatio,
    firedAt: new Date(nowMs).toISOString(),
  });
}

/**
 * Evaluate all provided configs and return the highest-severity firing alert (or null).
 * Priority order: page > ticket > none.
 */
export function evaluateAllBurnAlerts(
  sloId: string,
  configs: readonly BurnAlertConfig[],
  rates: MultiWindowBurnRates,
  errorBudgetConsumedRatio: number,
  nowMs: number,
): BurnAlertEvent | null {
  const fired = configs
    .map((c) => evaluateBurnAlert(sloId, c, rates, errorBudgetConsumedRatio, nowMs))
    .filter((e): e is BurnAlertEvent => e !== null);

  if (fired.length === 0) return null;

  // Return the most severe alert (page > ticket)
  const page = fired.find((e) => e.severity === "page");
  if (page !== undefined) return page;
  return fired[0] ?? null;
}
