// Shared SOC2 value types, branded IDs, and common zod schemas used across the module.

import { z } from "zod";
import { type Brand, brand } from "@veritas/core";

// --- Branded ID types ---

export type ControlId = Brand<string, "ControlId">;
export type EvidenceId = Brand<string, "EvidenceId">;
export type AssessmentId = Brand<string, "AssessmentId">;
export type FindingId = Brand<string, "FindingId">;
export type AttestationId = Brand<string, "AttestationId">;
export type CatalogCriterionId = Brand<string, "CatalogCriterionId">;
export type FrameworkMappingId = Brand<string, "FrameworkMappingId">;

export function asControlId(raw: string): ControlId {
  return brand<string, "ControlId">(raw);
}
export function asEvidenceId(raw: string): EvidenceId {
  return brand<string, "EvidenceId">(raw);
}
export function asAssessmentId(raw: string): AssessmentId {
  return brand<string, "AssessmentId">(raw);
}
export function asFindingId(raw: string): FindingId {
  return brand<string, "FindingId">(raw);
}
export function asAttestationId(raw: string): AttestationId {
  return brand<string, "AttestationId">(raw);
}
export function asCatalogCriterionId(raw: string): CatalogCriterionId {
  return brand<string, "CatalogCriterionId">(raw);
}
export function asFrameworkMappingId(raw: string): FrameworkMappingId {
  return brand<string, "FrameworkMappingId">(raw);
}

// --- Common compliance enums ---

export const ComplianceFrameworkSchema = z.enum([
  "soc2_type1",
  "soc2_type2",
  "iso27001",
  "nist_csf",
  "hipaa",
  "pci_dss",
  "gdpr",
]);
export type ComplianceFramework = z.infer<typeof ComplianceFrameworkSchema>;

export const RiskLevelSchema = z.enum(["critical", "high", "medium", "low", "informational"]);
export type RiskLevel = z.infer<typeof RiskLevelSchema>;

export const OperationalEffectivenessSchema = z.enum([
  "effective",
  "partially_effective",
  "ineffective",
  "not_tested",
]);
export type OperationalEffectiveness = z.infer<typeof OperationalEffectivenessSchema>;

export const DesignAdequacySchema = z.enum([
  "adequate",
  "partially_adequate",
  "inadequate",
  "not_assessed",
]);
export type DesignAdequacy = z.infer<typeof DesignAdequacySchema>;

export const EvidenceTypeSchema = z.enum([
  "screenshot",
  "log_export",
  "configuration_snapshot",
  "report",
  "policy_document",
  "interview_notes",
  "automated_test_result",
  "third_party_report",
  "other",
]);
export type EvidenceType = z.infer<typeof EvidenceTypeSchema>;

export const FindingSeveritySchema = z.enum(["critical", "high", "medium", "low", "observation"]);
export type FindingSeverity = z.infer<typeof FindingSeveritySchema>;

export const FindingStatusSchema = z.enum([
  "open",
  "in_remediation",
  "remediated",
  "accepted",
  "false_positive",
  "closed",
]);
export type FindingStatus = z.infer<typeof FindingStatusSchema>;

export const AttestationStatusSchema = z.enum([
  "pending",
  "signed",
  "expired",
  "revoked",
]);
export type AttestationStatus = z.infer<typeof AttestationStatusSchema>;

// --- Shared value object schemas ---

export const PeriodSchema = z.object({
  startDate: z.string().min(1),
  endDate: z.string().min(1),
});
export type Period = z.infer<typeof PeriodSchema>;

export const RemediationPlanSchema = z.object({
  description: z.string().min(1),
  targetDate: z.string().min(1),
  assignee: z.string().min(1),
  priority: RiskLevelSchema,
  steps: z.array(z.string()).default([]),
});
export type RemediationPlan = z.infer<typeof RemediationPlanSchema>;

export const EvidenceRefSchema = z.object({
  evidenceId: z.string().min(1),
  collectedAt: z.string().min(1),
  collectorName: z.string().min(1),
  description: z.string().optional(),
});
export type EvidenceRef = z.infer<typeof EvidenceRefSchema>;
