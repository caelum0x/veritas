// Retention policy definitions: named rules that specify how long records should be kept.
import { z } from "zod";
import { newId } from "@veritas/core";

export const RetentionCategorySchema = z.enum([
  "audit_log",
  "claim",
  "evidence",
  "report",
  "user_data",
  "billing",
  "session",
  "generic",
]);
export type RetentionCategory = z.infer<typeof RetentionCategorySchema>;

export const RetentionActionSchema = z.enum(["delete", "archive", "anonymize"]);
export type RetentionAction = z.infer<typeof RetentionActionSchema>;

export const RetentionPolicySchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string().default(""),
  category: RetentionCategorySchema,
  /** Retention duration in days. 0 means keep forever. */
  retentionDays: z.number().int().min(0),
  /** Action to take when the retention period expires. */
  action: RetentionActionSchema,
  /** Whether this policy can be overridden by a legal hold. */
  legalHoldEligible: z.boolean().default(true),
  enabled: z.boolean().default(true),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type RetentionPolicy = z.infer<typeof RetentionPolicySchema>;

export const CreateRetentionPolicySchema = RetentionPolicySchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type CreateRetentionPolicy = z.infer<typeof CreateRetentionPolicySchema>;

/** Build a new RetentionPolicy from a creation DTO with generated id and timestamps. */
export function makeRetentionPolicy(dto: CreateRetentionPolicy): RetentionPolicy {
  const now = new Date().toISOString();
  return RetentionPolicySchema.parse({
    ...dto,
    id: newId("rpol"),
    createdAt: now,
    updatedAt: now,
  });
}

/** Default built-in retention policies for well-known categories. */
export const DEFAULT_POLICIES: ReadonlyArray<CreateRetentionPolicy> = [
  {
    name: "Audit Log — 7 Years",
    description: "Retain audit logs for regulatory compliance.",
    category: "audit_log",
    retentionDays: 2555,
    action: "archive",
    legalHoldEligible: true,
    enabled: true,
  },
  {
    name: "User Data — 2 Years",
    description: "Retain user data for service continuity.",
    category: "user_data",
    retentionDays: 730,
    action: "anonymize",
    legalHoldEligible: true,
    enabled: true,
  },
  {
    name: "Session — 90 Days",
    description: "Retain session records for security analysis.",
    category: "session",
    retentionDays: 90,
    action: "delete",
    legalHoldEligible: false,
    enabled: true,
  },
  {
    name: "Billing — 7 Years",
    description: "Retain billing records per financial regulations.",
    category: "billing",
    retentionDays: 2555,
    action: "archive",
    legalHoldEligible: true,
    enabled: true,
  },
  {
    name: "Claim — 5 Years",
    description: "Retain claims for audit trail purposes.",
    category: "claim",
    retentionDays: 1825,
    action: "archive",
    legalHoldEligible: true,
    enabled: true,
  },
];
