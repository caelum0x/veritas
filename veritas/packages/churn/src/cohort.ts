// Churn cohorts: group accounts by risk band and shared characteristics for targeted retention
import { z } from "zod";
import { groupBy } from "@veritas/core";
import { type ChurnPrediction } from "./predictor.js";
import { type RiskBand } from "./risk-score.js";

export const CohortSchema = z.object({
  id: z.string(),
  name: z.string(),
  band: z.enum(["low", "medium", "high", "critical"]),
  accountIds: z.array(z.string()),
  avgChurnProbability: z.number().min(0).max(1),
  size: z.number().int().nonnegative(),
  dominantFactor: z.string().optional(),
  createdAt: z.string().datetime(),
});
export type Cohort = z.infer<typeof CohortSchema>;

const cohortName: Record<RiskBand, string> = {
  low: "Healthy Accounts",
  medium: "Watch List",
  high: "At-Risk Accounts",
  critical: "Critical — Immediate Retention",
};

const cohortId = (band: RiskBand): string => `cohort_${band}_${Date.now()}`;

/** Compute dominant top factor across a set of predictions */
const dominantFactor = (predictions: readonly ChurnPrediction[]): string | undefined => {
  const freq = new Map<string, number>();
  for (const p of predictions) {
    for (const f of p.topFactors) {
      freq.set(f, (freq.get(f) ?? 0) + 1);
    }
  }
  let max = 0;
  let top: string | undefined;
  for (const [f, count] of freq) {
    if (count > max) { max = count; top = f; }
  }
  return top;
};

/** Segment a set of predictions into risk cohorts */
export const buildCohorts = (predictions: readonly ChurnPrediction[]): Cohort[] => {
  const byBand = groupBy(predictions, (p) => p.riskBand);
  const now = new Date().toISOString();

  return (Object.entries(byBand) as [RiskBand, ChurnPrediction[]][]).map(
    ([band, members]) => {
      const avg =
        members.reduce((acc, m) => acc + m.churnProbability, 0) / members.length;

      return {
        id: cohortId(band),
        name: cohortName[band],
        band,
        accountIds: members.map((m) => m.accountId),
        avgChurnProbability: avg,
        size: members.length,
        dominantFactor: dominantFactor(members),
        createdAt: now,
      };
    },
  );
};

/** Find the cohort an account belongs to */
export const findAccountCohort = (
  accountId: string,
  cohorts: readonly Cohort[],
): Cohort | undefined =>
  cohorts.find((c) => c.accountIds.includes(accountId));

/** Return cohorts sorted by descending avg churn probability */
export const sortCohortsByRisk = (cohorts: readonly Cohort[]): Cohort[] =>
  [...cohorts].sort((a, b) => b.avgChurnProbability - a.avgChurnProbability);

/** Filter cohorts that exceed a minimum size threshold */
export const filterBySize = (cohorts: readonly Cohort[], minSize: number): Cohort[] =>
  cohorts.filter((c) => c.size >= minSize);
