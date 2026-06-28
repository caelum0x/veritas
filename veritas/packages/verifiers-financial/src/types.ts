// Financial-domain types: claims, fundamentals, filings, market snapshots.
import { z } from "zod";
import { scoreSchema, verdictSchema } from "@veritas/core";

/** Supported financial metric names extracted from claims. */
export const FinancialMetricSchema = z.enum([
  "revenue",
  "net_income",
  "eps",
  "market_cap",
  "pe_ratio",
  "debt_to_equity",
  "operating_cash_flow",
  "gross_margin",
  "dividend_yield",
  "price",
  "volume",
  "shares_outstanding",
  "book_value",
  "ebitda",
  "free_cash_flow",
]);
export type FinancialMetric = z.infer<typeof FinancialMetricSchema>;

/** Time range for a financial claim (e.g. "Q3 2024", "FY 2023"). */
export const FinancialPeriodSchema = z.object({
  label: z.string(),
  year: z.number().int().min(1900).max(2100),
  quarter: z.number().int().min(1).max(4).optional(),
  isFiscalYear: z.boolean().default(false),
});
export type FinancialPeriod = z.infer<typeof FinancialPeriodSchema>;

/** A parsed financial claim ready for verification. */
export const ParsedFinancialClaimSchema = z.object({
  claimId: z.string().min(1),
  rawText: z.string(),
  ticker: z.string().min(1).max(10).toUpperCase(),
  metric: FinancialMetricSchema,
  claimedValue: z.number(),
  unit: z.string().optional(),
  period: FinancialPeriodSchema.optional(),
  confidence: z.number().min(0).max(1),
});
export type ParsedFinancialClaim = z.infer<typeof ParsedFinancialClaimSchema>;

/** Company fundamentals snapshot from an authoritative source. */
export const CompanyFundamentalsSchema = z.object({
  ticker: z.string(),
  cik: z.string().optional(),
  companyName: z.string(),
  revenue: z.number().optional(),
  netIncome: z.number().optional(),
  eps: z.number().optional(),
  marketCap: z.number().optional(),
  peRatio: z.number().optional(),
  debtToEquity: z.number().optional(),
  operatingCashFlow: z.number().optional(),
  grossMarginPct: z.number().optional(),
  dividendYield: z.number().optional(),
  sharesOutstanding: z.number().optional(),
  bookValue: z.number().optional(),
  ebitda: z.number().optional(),
  freeCashFlow: z.number().optional(),
  periodLabel: z.string(),
  reportedAt: z.string(),
  sourceUrl: z.string().url().optional(),
});
export type CompanyFundamentals = z.infer<typeof CompanyFundamentalsSchema>;

/** Real-time or delayed market price snapshot. */
export const MarketSnapshotSchema = z.object({
  ticker: z.string(),
  price: z.number().positive(),
  volume: z.number().nonnegative(),
  previousClose: z.number().positive().optional(),
  marketCap: z.number().nonnegative().optional(),
  currency: z.string().default("USD"),
  asOf: z.string(),
  isDelayed: z.boolean().default(true),
});
export type MarketSnapshot = z.infer<typeof MarketSnapshotSchema>;

/** SEC EDGAR filing metadata. */
export const EdgarFilingSchema = z.object({
  cik: z.string(),
  companyName: z.string(),
  formType: z.string(),
  filedAt: z.string(),
  periodOfReport: z.string(),
  accessionNumber: z.string(),
  primaryDocumentUrl: z.string().url(),
  relevantExcerpts: z.array(z.string()).default([]),
});
export type EdgarFiling = z.infer<typeof EdgarFilingSchema>;

/** Result of applying a financial heuristic rule. */
export const RuleResultSchema = z.object({
  ruleId: z.string(),
  passed: z.boolean(),
  score: scoreSchema,
  verdict: verdictSchema,
  rationale: z.string(),
  details: z.record(z.unknown()).optional(),
});
export type RuleResult = z.infer<typeof RuleResultSchema>;

/** Aggregated scoring breakdown for a financial claim. */
export const FinancialScoreBreakdownSchema = z.object({
  overallScore: scoreSchema,
  verdict: verdictSchema,
  numericAccuracy: z.number().min(0).max(1),
  sourceReliability: z.number().min(0).max(1),
  recency: z.number().min(0).max(1),
  consistency: z.number().min(0).max(1),
  rulesPassed: z.number().int().nonnegative(),
  rulesTotal: z.number().int().nonnegative(),
  primarySourceUrl: z.string().url().optional(),
});
export type FinancialScoreBreakdown = z.infer<typeof FinancialScoreBreakdownSchema>;
