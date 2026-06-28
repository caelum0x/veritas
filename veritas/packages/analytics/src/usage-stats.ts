// Verification usage statistics — aggregates consumption metrics per organization

import { z } from "zod";

export const VerificationUsageBreakdownSchema = z.object({
  byVerdict: z.record(z.number()),
  bySource: z.record(z.number()),
  byAgent: z.record(z.number()),
  byHour: z.array(z.number()).length(24),
});

export type VerificationUsageBreakdown = z.infer<typeof VerificationUsageBreakdownSchema>;

export const QuotaStatusSchema = z.object({
  limit: z.number().nonnegative(),
  used: z.number().nonnegative(),
  remaining: z.number().nonnegative(),
  utilizationRate: z.number().min(0).max(1),
  isExceeded: z.boolean(),
});

export type QuotaStatus = z.infer<typeof QuotaStatusSchema>;

export const VerificationUsageStatsSchema = z.object({
  organizationId: z.string(),
  periodFrom: z.string(),
  periodTo: z.string(),
  totalVerifications: z.number().int().nonnegative(),
  totalClaims: z.number().int().nonnegative(),
  totalSources: z.number().int().nonnegative(),
  totalTokensConsumed: z.number().int().nonnegative(),
  averageClaimsPerVerification: z.number().nonnegative(),
  averageSourcesPerClaim: z.number().nonnegative(),
  averageProcessingMs: z.number().nonnegative(),
  p50ProcessingMs: z.number().nonnegative(),
  p95ProcessingMs: z.number().nonnegative(),
  p99ProcessingMs: z.number().nonnegative(),
  errorRate: z.number().min(0).max(1),
  breakdown: VerificationUsageBreakdownSchema,
  quota: QuotaStatusSchema.nullable(),
});

export type VerificationUsageStats = z.infer<typeof VerificationUsageStatsSchema>;

export interface RawUsageData {
  readonly organizationId: string;
  readonly periodFrom: string;
  readonly periodTo: string;
  readonly verifications: number;
  readonly claims: number;
  readonly sources: number;
  readonly tokensConsumed: number;
  readonly processingTimesMs: readonly number[];
  readonly errors: number;
  readonly verdictCounts: Record<string, number>;
  readonly sourceCounts: Record<string, number>;
  readonly agentCounts: Record<string, number>;
  readonly hourlyCounts: readonly number[];
  readonly quotaLimit: number | null;
}

function computePercentile(sorted: number[], pct: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.ceil((pct / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))]!;
}

function computeQuota(used: number, limit: number | null): QuotaStatus | null {
  if (limit === null) return null;
  const remaining = Math.max(0, limit - used);
  const utilizationRate = limit > 0 ? Math.min(1, used / limit) : 0;
  return { limit, used, remaining, utilizationRate, isExceeded: used > limit };
}

export function computeVerificationUsageStats(data: RawUsageData): VerificationUsageStats {
  const {
    organizationId, periodFrom, periodTo,
    verifications, claims, sources, tokensConsumed,
    processingTimesMs, errors,
    verdictCounts, sourceCounts, agentCounts, hourlyCounts,
    quotaLimit,
  } = data;

  const sorted = [...processingTimesMs].sort((a, b) => a - b);
  const total = sorted.reduce((s, v) => s + v, 0);
  const average = sorted.length > 0 ? total / sorted.length : 0;

  const normalized24 = Array.from({ length: 24 }, (_, i) => hourlyCounts[i] ?? 0);

  return {
    organizationId,
    periodFrom,
    periodTo,
    totalVerifications: verifications,
    totalClaims: claims,
    totalSources: sources,
    totalTokensConsumed: tokensConsumed,
    averageClaimsPerVerification: verifications > 0 ? claims / verifications : 0,
    averageSourcesPerClaim: claims > 0 ? sources / claims : 0,
    averageProcessingMs: average,
    p50ProcessingMs: computePercentile(sorted, 50),
    p95ProcessingMs: computePercentile(sorted, 95),
    p99ProcessingMs: computePercentile(sorted, 99),
    errorRate: verifications > 0 ? Math.min(1, errors / verifications) : 0,
    breakdown: {
      byVerdict: { ...verdictCounts },
      bySource: { ...sourceCounts },
      byAgent: { ...agentCounts },
      byHour: normalized24,
    },
    quota: computeQuota(verifications, quotaLimit),
  };
}
