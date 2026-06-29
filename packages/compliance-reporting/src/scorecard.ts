// Compliance scorecard: aggregates control results into a per-framework compliance score.

import { z } from "zod";
import { type IsoTimestamp, ok, err, type Result, isoTimestampSchema } from "@veritas/core";
import {
  ReportingFrameworkSchema,
  type ReportingFramework,
  DomainScoreSchema,
  type DomainScore,
  ControlComplianceStatusSchema,
  type ControlComplianceStatus,
  ReportPeriodSchema,
  asScorecardId,
  type ScorecardId,
} from "./types.js";
import { ScorecardNotFoundError } from "./errors.js";

// --- Schemas ---

export const ScorecardControlResultSchema = z.object({
  controlId: z.string().min(1),
  controlCode: z.string().min(1),
  controlName: z.string().min(1),
  domain: z.string().min(1),
  status: ControlComplianceStatusSchema,
  evidenceCount: z.number().int().nonnegative(),
  notes: z.string().optional(),
});
export type ScorecardControlResult = z.infer<typeof ScorecardControlResultSchema>;

/** @deprecated Use ScorecardControlResult. Kept for backward compat. */
export type ControlResult = ScorecardControlResult;

export const ScorecardSchema = z.object({
  id: z.string().min(1),
  framework: ReportingFrameworkSchema,
  period: ReportPeriodSchema,
  overallScore: z.number().min(0).max(100),
  totalControls: z.number().int().nonnegative(),
  compliantControls: z.number().int().nonnegative(),
  nonCompliantControls: z.number().int().nonnegative(),
  partialControls: z.number().int().nonnegative(),
  notApplicableControls: z.number().int().nonnegative(),
  notTestedControls: z.number().int().nonnegative(),
  domainScores: z.array(DomainScoreSchema),
  controlResults: z.array(ScorecardControlResultSchema),
  generatedAt: isoTimestampSchema,
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type Scorecard = z.infer<typeof ScorecardSchema>;

export const CreateScorecardInputSchema = z.object({
  framework: ReportingFrameworkSchema,
  period: ReportPeriodSchema,
  controlResults: z.array(ScorecardControlResultSchema),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type CreateScorecardInput = z.infer<typeof CreateScorecardInputSchema>;

// --- Pure computation helpers ---

/** Count controls by status in a result set. */
function countByStatus(
  results: readonly ScorecardControlResult[],
  status: ControlComplianceStatus,
): number {
  return results.filter((r) => r.status === status).length;
}

/** Compute score as percent of compliant out of tested (excluding N/A and not-tested). */
function computeOverallScore(results: readonly ScorecardControlResult[]): number {
  const tested = results.filter(
    (r) => r.status !== "not_applicable" && r.status !== "not_tested",
  ).length;
  if (tested === 0) return 0;
  const compliant = countByStatus(results, "compliant");
  return Math.round((compliant / tested) * 100 * 10) / 10;
}

/** Group control results by domain and compute per-domain scores. */
function computeDomainScores(results: readonly ScorecardControlResult[]): DomainScore[] {
  const byDomain = new Map<string, ScorecardControlResult[]>();
  for (const r of results) {
    const existing = byDomain.get(r.domain) ?? [];
    byDomain.set(r.domain, [...existing, r]);
  }
  const scores: DomainScore[] = [];
  for (const [domain, domainResults] of byDomain) {
    const total = domainResults.length;
    const compliant = countByStatus(domainResults, "compliant");
    const tested = domainResults.filter(
      (r) => r.status !== "not_applicable" && r.status !== "not_tested",
    ).length;
    const score = tested === 0 ? 0 : Math.round((compliant / tested) * 100 * 10) / 10;
    scores.push({ domain, totalControls: total, compliantControls: compliant, score });
  }
  return scores.sort((a, b) => a.domain.localeCompare(b.domain));
}

/** Build a Scorecard from a CreateScorecardInput at the given timestamp. */
export function buildScorecard(
  input: CreateScorecardInput,
  generatedAt: IsoTimestamp,
  idGenerator: () => string = () => crypto.randomUUID(),
): Scorecard {
  const { framework, period, controlResults, metadata } = input;
  const id = asScorecardId(idGenerator());
  return {
    id,
    framework,
    period,
    overallScore: computeOverallScore(controlResults),
    totalControls: controlResults.length,
    compliantControls: countByStatus(controlResults, "compliant"),
    nonCompliantControls: countByStatus(controlResults, "non_compliant"),
    partialControls: countByStatus(controlResults, "partially_compliant"),
    notApplicableControls: countByStatus(controlResults, "not_applicable"),
    notTestedControls: countByStatus(controlResults, "not_tested"),
    domainScores: computeDomainScores(controlResults),
    controlResults: [...controlResults],
    generatedAt,
    metadata,
  };
}

/** In-memory scorecard store — replace with a real persistence adapter in production. */
export class ScorecardStore {
  private readonly store = new Map<string, Scorecard>();

  save(scorecard: Scorecard): Scorecard {
    this.store.set(scorecard.id, scorecard);
    return scorecard;
  }

  findById(id: ScorecardId | string): Result<Scorecard, ScorecardNotFoundError> {
    const found = this.store.get(id);
    if (!found) return err(new ScorecardNotFoundError(id));
    return ok(found);
  }

  listByFramework(framework: ReportingFramework): Scorecard[] {
    return [...this.store.values()]
      .filter((s) => s.framework === framework)
      .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
  }

  latest(framework: ReportingFramework): Scorecard | undefined {
    return this.listByFramework(framework)[0];
  }
}
