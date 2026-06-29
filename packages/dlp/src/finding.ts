// DLP finding: represents a detected PII/secret occurrence in scanned content
import { z } from "zod";
import { newId } from "@veritas/core";

export const FindingTypeSchema = z.enum([
  "EMAIL",
  "SSN",
  "CREDIT_CARD",
  "PHONE",
  "SECRET_ENTROPY",
  "CUSTOM",
]);
export type FindingType = z.infer<typeof FindingTypeSchema>;

export const SeveritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
export type Severity = z.infer<typeof SeveritySchema>;

export const FindingSchema = z.object({
  id: z.string(),
  type: FindingTypeSchema,
  severity: SeveritySchema,
  field: z.string(),
  offset: z.number().int().nonnegative(),
  length: z.number().int().positive(),
  redacted: z.string(),
  detectedAt: z.string(),
  policyId: z.string().optional(),
});
export type Finding = z.infer<typeof FindingSchema>;

export function makeFinding(
  type: FindingType,
  severity: Severity,
  field: string,
  offset: number,
  length: number,
  redacted: string,
  policyId?: string,
): Finding {
  return {
    id: newId("finding"),
    type,
    severity,
    field,
    offset,
    length,
    redacted,
    detectedAt: new Date().toISOString(),
    policyId,
  };
}

export function isCritical(f: Finding): boolean {
  return f.severity === "CRITICAL";
}

export function isHighOrAbove(f: Finding): boolean {
  return f.severity === "HIGH" || f.severity === "CRITICAL";
}
