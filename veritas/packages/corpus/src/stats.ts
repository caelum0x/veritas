// Corpus statistics: aggregate metrics computed over a corpus and its records.

import { z } from "zod";
import { type Score, asScore, meanScore, scoreSchema } from "@veritas/core";
import type { Corpus } from "./corpus.js";
import type { CorpusRecord } from "./record.js";
import { toAuthorityTier, toQualityBand, type AuthorityTier, type QualityBand } from "./types.js";

/** Distribution counts by authority tier. */
export interface AuthorityDistribution {
  readonly primary: number;
  readonly secondary: number;
  readonly tertiary: number;
  readonly unvetted: number;
}

/** Distribution counts by quality band. */
export interface QualityDistribution {
  readonly high: number;
  readonly medium: number;
  readonly low: number;
  readonly rejected: number;
}

/** Top-level aggregate statistics for a corpus. */
export interface CorpusStats {
  readonly corpusId: string;
  readonly recordCount: number;
  readonly meanAuthorityWeight: Score;
  readonly meanQualityScore: Score;
  readonly authorityDistribution: AuthorityDistribution;
  readonly qualityDistribution: QualityDistribution;
  readonly tagFrequency: Readonly<Record<string, number>>;
  readonly topCurators: ReadonlyArray<{ curatedBy: string; count: number }>;
  readonly computedAt: string;
}

/** Zero-value authority distribution. */
const emptyAuthority = (): Record<AuthorityTier, number> => ({
  primary: 0,
  secondary: 0,
  tertiary: 0,
  unvetted: 0,
});

/** Zero-value quality distribution. */
const emptyQuality = (): Record<QualityBand, number> => ({
  high: 0,
  medium: 0,
  low: 0,
  rejected: 0,
});

/** Compute aggregate statistics over an array of corpus records. */
export function computeCorpusStats(
  corpus: Corpus,
  records: readonly CorpusRecord[],
): CorpusStats {
  const authorityDist = emptyAuthority();
  const qualityDist = emptyQuality();
  const tagCounts: Record<string, number> = {};
  const curatorCounts: Record<string, number> = {};

  const authorityWeights: Score[] = [];
  const qualityScores: Score[] = [];

  for (const record of records) {
    authorityWeights.push(asScore(record.authorityWeight));
    qualityScores.push(asScore(record.qualityScore));

    const tier = toAuthorityTier(asScore(record.authorityWeight));
    authorityDist[tier] += 1;

    const band = toQualityBand(asScore(record.qualityScore));
    qualityDist[band] += 1;

    for (const tag of record.tags) {
      tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
    }

    if (record.curatedBy != null) {
      curatorCounts[record.curatedBy] = (curatorCounts[record.curatedBy] ?? 0) + 1;
    }
  }

  const meanAuthority: Score =
    authorityWeights.length > 0 ? meanScore(authorityWeights) : asScore(0);
  const meanQuality: Score =
    qualityScores.length > 0 ? meanScore(qualityScores) : asScore(0);

  const topCurators = Object.entries(curatorCounts)
    .map(([curatedBy, count]) => ({ curatedBy, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    corpusId: corpus.id,
    recordCount: records.length,
    meanAuthorityWeight: meanAuthority,
    meanQualityScore: meanQuality,
    authorityDistribution: authorityDist,
    qualityDistribution: qualityDist,
    tagFrequency: tagCounts,
    topCurators,
    computedAt: new Date().toISOString(),
  };
}

/** Summarize stats as a human-readable string for logging. */
export function formatStatsSummary(stats: CorpusStats): string {
  const { recordCount, meanAuthorityWeight, meanQualityScore, authorityDistribution } = stats;
  return (
    `corpus=${stats.corpusId} records=${recordCount} ` +
    `meanAuthority=${meanAuthorityWeight.toFixed(3)} meanQuality=${meanQualityScore.toFixed(3)} ` +
    `primary=${authorityDistribution.primary} secondary=${authorityDistribution.secondary}`
  );
}
