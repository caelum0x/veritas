// News-domain types: outlets, articles, wire reports, and scoring structures.
import { z } from "zod";
import { scoreSchema, verdictSchema, isoTimestampSchema } from "@veritas/core";

/** Tier classification for news outlets by editorial standards. */
export const OutletTierSchema = z.enum(["tier1", "tier2", "tier3", "unknown"]);
export type OutletTier = z.infer<typeof OutletTierSchema>;

/** Known wire service identifiers. */
export const WireServiceSchema = z.enum(["ap", "reuters", "afp", "bloomberg", "other"]);
export type WireService = z.infer<typeof WireServiceSchema>;

/** Registry entry for a known news outlet. */
export const OutletRecordSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  tier: OutletTierSchema,
  domain: z.string().optional(),
  isWireService: z.boolean().default(false),
  isSatire: z.boolean().default(false),
  country: z.string().optional(),
  biasRating: z.number().min(-1).max(1).optional(),
  factCheckScore: scoreSchema.optional(),
});
export type OutletRecord = z.infer<typeof OutletRecordSchema>;

/** An article retrieved from a news outlet. */
export const NewsArticleSchema = z.object({
  id: z.string().min(1),
  outletName: z.string(),
  outletTier: OutletTierSchema,
  url: z.string().url(),
  title: z.string(),
  author: z.string().optional(),
  section: z.string().optional(),
  publishedAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema.optional(),
  wordCount: z.number().int().nonnegative().optional(),
  hasByline: z.boolean().default(false),
  isOpinion: z.boolean().default(false),
  isSatire: z.boolean().default(false),
  snippet: z.string().optional(),
});
export type NewsArticle = z.infer<typeof NewsArticleSchema>;

/** A wire service dispatch corroborating or contradicting a claim. */
export const WireReportSchema = z.object({
  id: z.string().min(1),
  wireService: WireServiceSchema,
  dateline: z.string().optional(),
  storyId: z.string().optional(),
  title: z.string(),
  publishedAt: isoTimestampSchema,
  wordCount: z.number().int().nonnegative().optional(),
  snippet: z.string().optional(),
  url: z.string().url().optional(),
});
export type WireReport = z.infer<typeof WireReportSchema>;

/** Parsed news claim ready for verification. */
export const ParsedNewsClaimSchema = z.object({
  claimId: z.string().min(1),
  rawText: z.string(),
  mentionedOutlets: z.array(z.string()),
  attributedSource: z.string().optional(),
  quotedText: z.string().optional(),
  eventDate: isoTimestampSchema.optional(),
  domain: z.string().optional(),
  confidence: z.number().min(0).max(1),
});
export type ParsedNewsClaim = z.infer<typeof ParsedNewsClaimSchema>;

/** Result of applying a single news heuristic rule. */
export const NewsRuleResultSchema = z.object({
  ruleId: z.string(),
  passed: z.boolean(),
  score: scoreSchema,
  verdict: verdictSchema,
  rationale: z.string(),
  details: z.record(z.unknown()).optional(),
});
export type NewsRuleResult = z.infer<typeof NewsRuleResultSchema>;

/** Aggregated scoring breakdown for a news claim. */
export const NewsScoreBreakdownSchema = z.object({
  overallScore: scoreSchema,
  verdict: verdictSchema,
  outletCredibility: z.number().min(0).max(1),
  corroboration: z.number().min(0).max(1),
  recency: z.number().min(0).max(1),
  wireConfirmation: z.number().min(0).max(1),
  rulesPassed: z.number().int().nonnegative(),
  rulesTotal: z.number().int().nonnegative(),
  primarySourceUrl: z.string().url().optional(),
});
export type NewsScoreBreakdown = z.infer<typeof NewsScoreBreakdownSchema>;
