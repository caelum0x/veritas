// Handling policies per classification level: encryption, retention, access, and audit requirements

import { z } from "zod";
import { ClassificationLevelSchema, type ClassificationLevel } from "./classification.js";

export const EncryptionRequirementSchema = z.enum(["none", "in-transit", "at-rest", "both"]);
export type EncryptionRequirement = z.infer<typeof EncryptionRequirementSchema>;

export const RetentionPolicySchema = z.object({
  /** Maximum days to retain data; undefined means indefinite. */
  maxDays: z.number().int().positive().optional(),
  /** Whether data must be purged (not just archived) after maxDays. */
  hardDelete: z.boolean().default(false),
});
export type RetentionPolicy = z.infer<typeof RetentionPolicySchema>;

export const HandlingPolicySchema = z.object({
  level: ClassificationLevelSchema,
  encryption: EncryptionRequirementSchema,
  retention: RetentionPolicySchema,
  /** Whether every read access must be audit-logged. */
  auditReads: z.boolean(),
  /** Whether every write access must be audit-logged. */
  auditWrites: z.boolean(),
  /** Roles allowed to access data at this level. */
  allowedRoles: z.array(z.string()),
  /** Whether data can be exported outside the platform. */
  exportAllowed: z.boolean(),
});

export type HandlingPolicy = z.infer<typeof HandlingPolicySchema>;

const DEFAULT_POLICIES: Record<ClassificationLevel, HandlingPolicy> = {
  public: {
    level: "public",
    encryption: "in-transit",
    retention: { maxDays: undefined, hardDelete: false },
    auditReads: false,
    auditWrites: false,
    allowedRoles: ["*"],
    exportAllowed: true,
  },
  internal: {
    level: "internal",
    encryption: "in-transit",
    retention: { maxDays: 1825, hardDelete: false },
    auditReads: false,
    auditWrites: true,
    allowedRoles: ["employee", "admin"],
    exportAllowed: false,
  },
  confidential: {
    level: "confidential",
    encryption: "both",
    retention: { maxDays: 365, hardDelete: true },
    auditReads: true,
    auditWrites: true,
    allowedRoles: ["analyst", "admin"],
    exportAllowed: false,
  },
  restricted: {
    level: "restricted",
    encryption: "both",
    retention: { maxDays: 90, hardDelete: true },
    auditReads: true,
    auditWrites: true,
    allowedRoles: ["admin"],
    exportAllowed: false,
  },
};

/** Retrieve the default handling policy for a classification level. */
export function getPolicyForLevel(level: ClassificationLevel): HandlingPolicy {
  return { ...DEFAULT_POLICIES[level] };
}

/** Override specific fields of the default policy for a level. */
export function customizePolicy(
  level: ClassificationLevel,
  overrides: Partial<Omit<HandlingPolicy, "level">>,
): HandlingPolicy {
  const base = getPolicyForLevel(level);
  return HandlingPolicySchema.parse({ ...base, ...overrides, level });
}
