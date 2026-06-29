// Retention cohort analysis — measures user re-engagement over time windows

import { z } from "zod";

export const RetentionBucketSchema = z.object({
  periodIndex: z.number().int().nonnegative(),
  label: z.string(),
  activeUsers: z.number().int().nonnegative(),
  retentionRate: z.number().min(0).max(1),
});

export type RetentionBucket = z.infer<typeof RetentionBucketSchema>;

export const RetentionCohortSchema = z.object({
  organizationId: z.string(),
  cohortDate: z.string(),
  cohortSize: z.number().int().nonnegative(),
  granularity: z.enum(["day", "week", "month"]),
  buckets: z.array(RetentionBucketSchema),
  averageRetentionRate: z.number().min(0).max(1),
});

export type RetentionCohort = z.infer<typeof RetentionCohortSchema>;

export interface RawCohortData {
  readonly organizationId: string;
  readonly cohortDate: string;
  readonly cohortSize: number;
  readonly granularity: "day" | "week" | "month";
  readonly periodicActiveCounts: ReadonlyArray<{ readonly label: string; readonly activeUsers: number }>;
}

export function computeRetentionCohort(data: RawCohortData): RetentionCohort {
  const { organizationId, cohortDate, cohortSize, granularity, periodicActiveCounts } = data;

  if (cohortSize === 0 || periodicActiveCounts.length === 0) {
    return {
      organizationId,
      cohortDate,
      cohortSize,
      granularity,
      buckets: [],
      averageRetentionRate: 0,
    };
  }

  const buckets: RetentionBucket[] = periodicActiveCounts.map((entry, index) => {
    const retentionRate = Math.max(0, Math.min(1, entry.activeUsers / cohortSize));
    return {
      periodIndex: index,
      label: entry.label,
      activeUsers: entry.activeUsers,
      retentionRate,
    };
  });

  const totalRate = buckets.reduce((sum, b) => sum + b.retentionRate, 0);
  const averageRetentionRate = buckets.length > 0 ? totalRate / buckets.length : 0;

  return {
    organizationId,
    cohortDate,
    cohortSize,
    granularity,
    buckets,
    averageRetentionRate: Math.max(0, Math.min(1, averageRetentionRate)),
  };
}

export function mergeRetentionCohorts(cohorts: RetentionCohort[]): RetentionCohort | null {
  if (cohorts.length === 0) return null;
  const first = cohorts[0]!;

  const maxBuckets = Math.max(...cohorts.map((c) => c.buckets.length));
  const mergedBuckets: RetentionBucket[] = [];

  for (let i = 0; i < maxBuckets; i++) {
    const relevant = cohorts.filter((c) => c.buckets[i] !== undefined);
    if (relevant.length === 0) continue;

    const totalCohortSize = relevant.reduce((sum, c) => sum + c.cohortSize, 0);
    const totalActive = relevant.reduce((sum, c) => sum + (c.buckets[i]?.activeUsers ?? 0), 0);
    const retentionRate = totalCohortSize > 0 ? totalActive / totalCohortSize : 0;

    mergedBuckets.push({
      periodIndex: i,
      label: relevant[0]!.buckets[i]!.label,
      activeUsers: totalActive,
      retentionRate: Math.max(0, Math.min(1, retentionRate)),
    });
  }

  const avgRate =
    mergedBuckets.length > 0
      ? mergedBuckets.reduce((s, b) => s + b.retentionRate, 0) / mergedBuckets.length
      : 0;

  return {
    organizationId: first.organizationId,
    cohortDate: first.cohortDate,
    cohortSize: cohorts.reduce((sum, c) => sum + c.cohortSize, 0),
    granularity: first.granularity,
    buckets: mergedBuckets,
    averageRetentionRate: Math.max(0, Math.min(1, avgRate)),
  };
}
