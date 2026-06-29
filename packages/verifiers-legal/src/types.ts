// Legal-domain types: parsed claims, statutes, case law, jurisdictions, and scoring.
import { z } from "zod";
import { scoreSchema, verdictSchema } from "@veritas/core";

/** Supported legal claim categories. */
export const LegalClaimCategorySchema = z.enum([
  "statute_citation",
  "case_citation",
  "regulatory_requirement",
  "contract_term",
  "constitutional_provision",
  "treaty_provision",
  "general_legal_assertion",
]);
export type LegalClaimCategory = z.infer<typeof LegalClaimCategorySchema>;

/** Jurisdiction levels for a legal claim. */
export const JurisdictionLevelSchema = z.enum([
  "federal",
  "state",
  "local",
  "international",
  "eu",
  "unknown",
]);
export type JurisdictionLevel = z.infer<typeof JurisdictionLevelSchema>;

/** A parsed legal claim ready for verification. */
export const ParsedLegalClaimSchema = z.object({
  claimId: z.string().min(1),
  rawText: z.string(),
  category: LegalClaimCategorySchema,
  citationRef: z.string().optional(),
  jurisdictionLevel: JurisdictionLevelSchema,
  jurisdictionName: z.string().optional(),
  effectiveYear: z.number().int().min(1776).max(2100).optional(),
  confidence: z.number().min(0).max(1),
});
export type ParsedLegalClaim = z.infer<typeof ParsedLegalClaimSchema>;

/** A statute record from an authoritative legal source. */
export const StatuteRecordSchema = z.object({
  citation: z.string(),
  title: z.string(),
  jurisdiction: z.string(),
  enactedYear: z.number().int().optional(),
  currentText: z.string(),
  status: z.enum(["active", "repealed", "amended", "superseded"]),
  effectiveDate: z.string(),
  sourceUrl: z.string().url().optional(),
  lastVerifiedAt: z.string(),
});
export type StatuteRecord = z.infer<typeof StatuteRecordSchema>;

/** A case law record from an authoritative legal source. */
export const CaseLawRecordSchema = z.object({
  citation: z.string(),
  caseName: z.string(),
  court: z.string(),
  decidedYear: z.number().int(),
  jurisdiction: z.string(),
  holding: z.string(),
  headnotes: z.array(z.string()).default([]),
  isOverruled: z.boolean().default(false),
  overruledBy: z.string().optional(),
  sourceUrl: z.string().url().optional(),
  retrievedAt: z.string(),
});
export type CaseLawRecord = z.infer<typeof CaseLawRecordSchema>;

/** A jurisdiction descriptor. */
export const JurisdictionRecordSchema = z.object({
  code: z.string(),
  name: z.string(),
  level: JurisdictionLevelSchema,
  parentCode: z.string().optional(),
  legalSystem: z.enum(["common_law", "civil_law", "mixed", "religious", "customary"]),
  activeStatutorySources: z.array(z.string()).default([]),
  notes: z.string().optional(),
});
export type JurisdictionRecord = z.infer<typeof JurisdictionRecordSchema>;

/** Result of applying a single legal heuristic rule. */
export const LegalRuleResultSchema = z.object({
  ruleId: z.string(),
  passed: z.boolean(),
  score: scoreSchema,
  verdict: verdictSchema,
  rationale: z.string(),
  details: z.record(z.unknown()).optional(),
});
export type LegalRuleResult = z.infer<typeof LegalRuleResultSchema>;

/** Aggregated scoring breakdown for a legal claim. */
export const LegalScoreBreakdownSchema = z.object({
  overallScore: scoreSchema,
  verdict: verdictSchema,
  citationAccuracy: z.number().min(0).max(1),
  sourceAuthority: z.number().min(0).max(1),
  jurisdictionRelevance: z.number().min(0).max(1),
  currentness: z.number().min(0).max(1),
  rulesPassed: z.number().int().nonnegative(),
  rulesTotal: z.number().int().nonnegative(),
  primarySourceUrl: z.string().url().optional(),
});
export type LegalScoreBreakdown = z.infer<typeof LegalScoreBreakdownSchema>;
