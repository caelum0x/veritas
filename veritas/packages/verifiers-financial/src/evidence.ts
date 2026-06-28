// Financial evidence model: typed evidence structures for SEC filings, tickers, and market data.

import { z } from "zod";
import { isoTimestampSchema, scoreSchema } from "@veritas/core";
import { DomainEvidenceSchema } from "@veritas/verifier-kit";

/** SEC filing evidence with specific regulatory metadata. */
export const SecFilingEvidenceSchema = DomainEvidenceSchema.extend({
  sourceType: z.literal("sec-filing"),
  metadata: z.object({
    cik: z.string(),
    accessionNumber: z.string(),
    formType: z.string(),
    filingDate: isoTimestampSchema,
    reportPeriod: isoTimestampSchema.nullable(),
    companyName: z.string(),
    ticker: z.string().optional(),
  }),
});
export type SecFilingEvidence = z.infer<typeof SecFilingEvidenceSchema>;

/** Market data evidence for price/volume claims. */
export const MarketDataEvidenceSchema = DomainEvidenceSchema.extend({
  sourceType: z.literal("market-data"),
  metadata: z.object({
    ticker: z.string(),
    exchange: z.string(),
    price: z.number().positive(),
    volume: z.number().nonnegative(),
    marketCap: z.number().nonnegative().optional(),
    dataDate: isoTimestampSchema,
    source: z.string(),
  }),
});
export type MarketDataEvidence = z.infer<typeof MarketDataEvidenceSchema>;

/** Fundamental financials evidence (revenue, earnings, etc.). */
export const FundamentalsEvidenceSchema = DomainEvidenceSchema.extend({
  sourceType: z.literal("fundamentals"),
  metadata: z.object({
    ticker: z.string(),
    period: z.string(),
    fiscalYear: z.number().int(),
    fiscalQuarter: z.number().int().min(1).max(4).optional(),
    revenue: z.number().optional(),
    netIncome: z.number().optional(),
    eps: z.number().optional(),
    peRatio: z.number().optional(),
    debtToEquity: z.number().optional(),
  }),
});
export type FundamentalsEvidence = z.infer<typeof FundamentalsEvidenceSchema>;

/** Union of all financial evidence types. */
export type FinancialEvidence = SecFilingEvidence | MarketDataEvidence | FundamentalsEvidence;

/** Aggregate financial evidence result from all sources. */
export interface FinancialEvidenceResult {
  readonly claimId: string;
  readonly ticker: string | null;
  readonly filingEvidence: ReadonlyArray<SecFilingEvidence>;
  readonly marketEvidence: ReadonlyArray<MarketDataEvidence>;
  readonly fundamentalsEvidence: ReadonlyArray<FundamentalsEvidence>;
  readonly overallRelevance: number;
}

/** Build a FinancialEvidenceResult (pure, immutable). */
export function makeFinancialEvidenceResult(
  claimId: string,
  ticker: string | null,
  filingEvidence: ReadonlyArray<SecFilingEvidence>,
  marketEvidence: ReadonlyArray<MarketDataEvidence>,
  fundamentalsEvidence: ReadonlyArray<FundamentalsEvidence>,
): FinancialEvidenceResult {
  const allScores = [
    ...filingEvidence.map((e) => e.relevanceScore),
    ...marketEvidence.map((e) => e.relevanceScore),
    ...fundamentalsEvidence.map((e) => e.relevanceScore),
  ];
  const overallRelevance =
    allScores.length > 0
      ? allScores.reduce((a, b) => a + b, 0) / allScores.length
      : 0;
  return Object.freeze({
    claimId,
    ticker,
    filingEvidence: [...filingEvidence],
    marketEvidence: [...marketEvidence],
    fundamentalsEvidence: [...fundamentalsEvidence],
    overallRelevance,
  });
}
