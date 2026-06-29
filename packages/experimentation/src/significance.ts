// Statistical significance testing for experiment metrics (z-test, chi-square)
import { z } from "zod";

export const SignificanceResultSchema = z.object({
  significant: z.boolean(),
  pValue: z.number(),
  zScore: z.number(),
  confidenceLevel: z.number(),
  relativeUplift: z.number(),
});

export type SignificanceResult = z.infer<typeof SignificanceResultSchema>;

export const SampleStatsSchema = z.object({
  conversions: z.number().int().nonnegative(),
  observations: z.number().int().positive(),
});

export type SampleStats = z.infer<typeof SampleStatsSchema>;

/** Approximate normal CDF via Abramowitz & Stegun formula 26.2.17 */
function normalCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const poly =
    t * (0.319381530 +
      t * (-0.356563782 +
        t * (1.781477937 +
          t * (-1.821255978 +
            t * 1.330274429))));
  const p = 1 - (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * z * z) * poly;
  return z >= 0 ? p : 1 - p;
}

/** Two-tailed p-value from z-score */
function twoTailedP(zScore: number): number {
  return 2 * (1 - normalCdf(Math.abs(zScore)));
}

/**
 * Two-proportion z-test to determine if variant conversion rate differs
 * significantly from control conversion rate.
 */
export function testProportions(
  control: SampleStats,
  variant: SampleStats,
  confidenceLevel = 0.95
): SignificanceResult {
  const p1 = control.conversions / control.observations;
  const p2 = variant.conversions / variant.observations;
  const pooled =
    (control.conversions + variant.conversions) /
    (control.observations + variant.observations);
  const se = Math.sqrt(
    pooled * (1 - pooled) * (1 / control.observations + 1 / variant.observations)
  );
  const zScore = se === 0 ? 0 : (p2 - p1) / se;
  const pValue = twoTailedP(zScore);
  const alpha = 1 - confidenceLevel;
  const relativeUplift = p1 === 0 ? 0 : (p2 - p1) / p1;
  return {
    significant: pValue < alpha,
    pValue,
    zScore,
    confidenceLevel,
    relativeUplift,
  };
}

/** Welch's t-test approximated via normal distribution for large samples */
export function testMeans(
  controlMean: number,
  controlVariance: number,
  controlN: number,
  variantMean: number,
  variantVariance: number,
  variantN: number,
  confidenceLevel = 0.95
): SignificanceResult {
  const se = Math.sqrt(controlVariance / controlN + variantVariance / variantN);
  const zScore = se === 0 ? 0 : (variantMean - controlMean) / se;
  const pValue = twoTailedP(zScore);
  const alpha = 1 - confidenceLevel;
  const relativeUplift =
    controlMean === 0 ? 0 : (variantMean - controlMean) / controlMean;
  return {
    significant: pValue < alpha,
    pValue,
    zScore,
    confidenceLevel,
    relativeUplift,
  };
}
