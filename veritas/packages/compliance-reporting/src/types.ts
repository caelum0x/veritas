// Shared value types, branded IDs, and zod schemas for the compliance-reporting module.

import { z } from "zod";
import { type Brand, brand } from "@veritas/core";

// --- Branded ID types ---

export type ComplianceReportId = Brand<string, "ComplianceReportId">;
export type ScorecardId = Brand<string, "ScorecardId">;
export type EvidenceLinkId = Brand<string, "EvidenceLinkId">;
export type ScheduleId = Brand<string, "ScheduleId">;
export type GapId = Brand<string, "GapId">;

export function asComplianceReportId(raw: string): ComplianceReportId {
  return brand<string, "ComplianceReportId">(raw);
}
export function asScorecardId(raw: string): ScorecardId {
  return brand<string, "ScorecardId">(raw);
}
export function asEvidenceLinkId(raw: string): EvidenceLinkId {
  return brand<string, "EvidenceLinkId">(raw);
}
export function asScheduleId(raw: string): ScheduleId {
  return brand<string, "ScheduleId">(raw);
}
export function asGapId(raw: string): GapId {
  return brand<string, "GapId">(raw);
}

// --- Framework enum ---

export const ReportingFrameworkSchema = z.enum([
  "soc2_type1",
  "soc2_type2",
  "iso27001",
  "gdpr",
  "hipaa",
  "nist_csf",
  "pci_dss",
]);
export type ReportingFramework = z.infer<typeof ReportingFrameworkSchema>;

// --- Report status ---

export const ReportStatusSchema = z.enum([
  "draft",
  "in_review",
  "approved",
  "published",
  "archived",
]);
export type ReportStatus = z.infer<typeof ReportStatusSchema>;

// --- Control compliance status ---

export const ControlComplianceStatusSchema = z.enum([
  "compliant",
  "non_compliant",
  "partially_compliant",
  "not_applicable",
  "not_tested",
]);
export type ControlComplianceStatus = z.infer<typeof ControlComplianceStatusSchema>;

// --- Gap severity ---

export const GapSeveritySchema = z.enum(["critical", "high", "medium", "low"]);
export type GapSeverity = z.infer<typeof GapSeveritySchema>;

// --- Schedule recurrence ---

export const ScheduleRecurrenceSchema = z.enum([
  "monthly",
  "quarterly",
  "semi_annual",
  "annual",
]);
export type ScheduleRecurrence = z.infer<typeof ScheduleRecurrenceSchema>;

// --- Schedule status ---

export const ScheduleStatusSchema = z.enum(["active", "paused", "completed", "cancelled"]);
export type ScheduleStatus = z.infer<typeof ScheduleStatusSchema>;

// --- Period value object ---

export const ReportPeriodSchema = z.object({
  startDate: z.string().min(1),
  endDate: z.string().min(1),
});
export type ReportPeriod = z.infer<typeof ReportPeriodSchema>;

// --- Domain score breakdown ---

export const DomainScoreSchema = z.object({
  domain: z.string().min(1),
  totalControls: z.number().int().nonnegative(),
  compliantControls: z.number().int().nonnegative(),
  score: z.number().min(0).max(100),
});
export type DomainScore = z.infer<typeof DomainScoreSchema>;

// --- Evidence link status ---

export const EvidenceLinkStatusSchema = z.enum([
  "active",
  "expired",
  "superseded",
  "revoked",
]);
export type EvidenceLinkStatus = z.infer<typeof EvidenceLinkStatusSchema>;
