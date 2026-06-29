// Funnel analysis — tracks drop-off rates across verification pipeline stages

import { z } from "zod";

export const FunnelStageSchema = z.object({
  name: z.string(),
  label: z.string(),
  count: z.number().int().nonnegative(),
  conversionRate: z.number().min(0).max(1),
  dropOffRate: z.number().min(0).max(1),
  dropOffCount: z.number().int().nonnegative(),
});

export type FunnelStage = z.infer<typeof FunnelStageSchema>;

export const FunnelResultSchema = z.object({
  organizationId: z.string(),
  periodFrom: z.string(),
  periodTo: z.string(),
  stages: z.array(FunnelStageSchema),
  totalEntries: z.number().int().nonnegative(),
  totalCompletions: z.number().int().nonnegative(),
  overallConversionRate: z.number().min(0).max(1),
});

export type FunnelResult = z.infer<typeof FunnelResultSchema>;

export interface RawFunnelData {
  readonly organizationId: string;
  readonly periodFrom: string;
  readonly periodTo: string;
  readonly stageCounts: ReadonlyArray<{ readonly name: string; readonly label: string; readonly count: number }>;
}

export function computeFunnel(data: RawFunnelData): FunnelResult {
  const { organizationId, periodFrom, periodTo, stageCounts } = data;

  if (stageCounts.length === 0) {
    return {
      organizationId,
      periodFrom,
      periodTo,
      stages: [],
      totalEntries: 0,
      totalCompletions: 0,
      overallConversionRate: 0,
    };
  }

  const totalEntries = stageCounts[0]!.count;
  const totalCompletions = stageCounts[stageCounts.length - 1]!.count;

  const stages: FunnelStage[] = stageCounts.map((stage, index) => {
    const previousCount = index === 0 ? totalEntries : stageCounts[index - 1]!.count;
    const conversionRate = previousCount > 0 ? stage.count / previousCount : 0;
    const dropOffCount = previousCount - stage.count;
    const dropOffRate = previousCount > 0 ? dropOffCount / previousCount : 0;

    return {
      name: stage.name,
      label: stage.label,
      count: stage.count,
      conversionRate: Math.max(0, Math.min(1, conversionRate)),
      dropOffRate: Math.max(0, Math.min(1, dropOffRate)),
      dropOffCount: Math.max(0, dropOffCount),
    };
  });

  const overallConversionRate = totalEntries > 0 ? totalCompletions / totalEntries : 0;

  return {
    organizationId,
    periodFrom,
    periodTo,
    stages,
    totalEntries,
    totalCompletions,
    overallConversionRate: Math.max(0, Math.min(1, overallConversionRate)),
  };
}

export function verificationFunnelStageNames(): string[] {
  return ["claim_submitted", "sources_fetched", "evidence_extracted", "verdict_assigned", "report_delivered"];
}

export function identifyFunnelBottleneck(funnel: FunnelResult): FunnelStage | null {
  if (funnel.stages.length === 0) return null;
  return funnel.stages.reduce((worst, stage) =>
    stage.dropOffRate > worst.dropOffRate ? stage : worst
  );
}
