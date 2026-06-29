// NPS score calculation — computes net promoter score from a set of responses.
import { Result, ok, err } from "@veritas/core";
import { NpsResponse } from "./response.js";
import { RespondentCategory } from "./types.js";

export interface NpsScoreBreakdown {
  readonly totalResponses: number;
  readonly promoters: number;
  readonly passives: number;
  readonly detractors: number;
  readonly promoterPct: number;
  readonly passivePct: number;
  readonly detractorPct: number;
  /** Net Promoter Score: promoterPct - detractorPct, range -100 to 100 */
  readonly nps: number;
}

const pct = (count: number, total: number): number =>
  total === 0 ? 0 : Math.round((count / total) * 10000) / 100;

export const computeNpsScore = (
  responses: readonly NpsResponse[]
): Result<NpsScoreBreakdown, Error> => {
  if (responses.length === 0) {
    return err(new Error("Cannot compute NPS score: no responses provided"));
  }

  const counts: Record<RespondentCategory, number> = {
    promoter: 0,
    passive: 0,
    detractor: 0,
  };

  for (const r of responses) {
    counts[r.category]++;
  }

  const total = responses.length;
  const promoterPct = pct(counts.promoter, total);
  const passivePct = pct(counts.passive, total);
  const detractorPct = pct(counts.detractor, total);
  const nps = Math.round(promoterPct - detractorPct);

  return ok(
    Object.freeze({
      totalResponses: total,
      promoters: counts.promoter,
      passives: counts.passive,
      detractors: counts.detractor,
      promoterPct,
      passivePct,
      detractorPct,
      nps,
    })
  );
};

export const computeNpsForPeriod = (
  responses: readonly NpsResponse[],
  from: string,
  to: string
): Result<NpsScoreBreakdown, Error> => {
  const fromMs = Date.parse(from);
  const toMs = Date.parse(to);
  if (isNaN(fromMs) || isNaN(toMs))
    return err(new Error("Invalid date range provided"));
  if (fromMs > toMs)
    return err(new Error("from must be before to"));

  const filtered = responses.filter((r) => {
    const ts = Date.parse(r.createdAt);
    return ts >= fromMs && ts <= toMs;
  });

  return computeNpsScore(filtered);
};

export const rollingNps = (
  responses: readonly NpsResponse[],
  windowDays: number
): Result<NpsScoreBreakdown, Error> => {
  if (windowDays <= 0)
    return err(new Error("windowDays must be a positive integer"));
  const cutoff = Date.now() - windowDays * 24 * 60 * 60 * 1000;
  const filtered = responses.filter((r) => Date.parse(r.createdAt) >= cutoff);
  return computeNpsScore(filtered);
};
