// Core GDPR domain types for DSR lifecycle, consent, and lawful basis.

import { z } from "zod";
import { isoTimestampSchema } from "@veritas/core";

// DSR types
export const DsrTypeSchema = z.enum([
  "access",
  "erasure",
  "portability",
  "rectification",
  "restriction",
  "objection",
]);
export type DsrType = z.infer<typeof DsrTypeSchema>;

export const DsrStatusSchema = z.enum([
  "pending",
  "identity_verified",
  "in_progress",
  "completed",
  "rejected",
  "withdrawn",
]);
export type DsrStatus = z.infer<typeof DsrStatusSchema>;

export const VerificationMethodSchema = z.enum([
  "email_otp",
  "sms_otp",
  "government_id",
  "account_credentials",
  "magic_link",
]);
export type VerificationMethod = z.infer<typeof VerificationMethodSchema>;

export const DataSubjectSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  name: z.string().optional(),
  organizationId: z.string().optional(),
});
export type DataSubject = z.infer<typeof DataSubjectSchema>;

export const DsrRequestSchema = z.object({
  id: z.string().min(1),
  type: DsrTypeSchema,
  status: DsrStatusSchema,
  subject: DataSubjectSchema,
  description: z.string().optional(),
  verificationMethod: VerificationMethodSchema.optional(),
  verifiedAt: isoTimestampSchema.optional(),
  completedAt: isoTimestampSchema.optional(),
  rejectionReason: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
});
export type DsrRequest = z.infer<typeof DsrRequestSchema>;

export const CreateDsrRequestSchema = z.object({
  type: DsrTypeSchema,
  subject: DataSubjectSchema,
  description: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type CreateDsrRequest = z.infer<typeof CreateDsrRequestSchema>;

// Consent types
export const ConsentPurposeSchema = z.enum([
  "analytics",
  "marketing",
  "functional",
  "necessary",
  "profiling",
  "third_party_sharing",
]);
export type ConsentPurpose = z.infer<typeof ConsentPurposeSchema>;

export const ConsentStatusSchema = z.enum(["granted", "denied", "withdrawn", "expired"]);
export type ConsentStatus = z.infer<typeof ConsentStatusSchema>;

export const ConsentRecordSchema = z.object({
  id: z.string().min(1),
  subjectId: z.string().min(1),
  purpose: ConsentPurposeSchema,
  status: ConsentStatusSchema,
  version: z.string().min(1),
  channel: z.string().min(1),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  withdrawnAt: isoTimestampSchema.optional(),
  expiresAt: isoTimestampSchema.optional(),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
});
export type ConsentRecord = z.infer<typeof ConsentRecordSchema>;

// Lawful basis types
export const LawfulBasisTypeSchema = z.enum([
  "consent",
  "contract",
  "legal_obligation",
  "vital_interests",
  "public_task",
  "legitimate_interests",
]);
export type LawfulBasisType = z.infer<typeof LawfulBasisTypeSchema>;

export const LawfulBasisSchema = z.object({
  id: z.string().min(1),
  purpose: z.string().min(1),
  basisType: LawfulBasisTypeSchema,
  description: z.string().min(1),
  dataCategories: z.array(z.string()),
  retentionPeriodDays: z.number().int().positive(),
  legalReference: z.string().optional(),
  active: z.boolean(),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
});
export type LawfulBasis = z.infer<typeof LawfulBasisSchema>;

// Data inventory types
export const DataCategorySchema = z.enum([
  "personal",
  "sensitive",
  "financial",
  "health",
  "biometric",
  "location",
  "behavioral",
  "communications",
]);
export type DataCategory = z.infer<typeof DataCategorySchema>;

export const DataInventoryEntrySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  categories: z.array(DataCategorySchema),
  storageLocation: z.string().min(1),
  lawfulBasisId: z.string().min(1),
  retentionPeriodDays: z.number().int().positive(),
  crossBorderTransfer: z.boolean(),
  transferSafeguards: z.string().optional(),
  processorName: z.string().optional(),
  active: z.boolean(),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
});
export type DataInventoryEntry = z.infer<typeof DataInventoryEntrySchema>;

// Identity verification types
export const IdentityVerificationResultSchema = z.object({
  verified: z.boolean(),
  method: VerificationMethodSchema,
  verifiedAt: isoTimestampSchema.optional(),
  failureReason: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
});
export type IdentityVerificationResult = z.infer<typeof IdentityVerificationResultSchema>;

// Portability export types
export const PortabilityFormatSchema = z.enum(["json", "csv", "xml"]);
export type PortabilityFormat = z.infer<typeof PortabilityFormatSchema>;

export const PortabilityExportSchema = z.object({
  dsrId: z.string().min(1),
  subjectId: z.string().min(1),
  format: PortabilityFormatSchema,
  data: z.record(z.string(), z.unknown()),
  checksum: z.string().min(1),
  generatedAt: isoTimestampSchema,
  expiresAt: isoTimestampSchema,
});
export type PortabilityExport = z.infer<typeof PortabilityExportSchema>;

// Rectification types
export const RectificationRequestSchema = z.object({
  dsrId: z.string().min(1),
  subjectId: z.string().min(1),
  corrections: z.record(z.string(), z.unknown()),
  justification: z.string().min(1),
  appliedAt: isoTimestampSchema.optional(),
});
export type RectificationRequest = z.infer<typeof RectificationRequestSchema>;

// DSR workflow step
export const WorkflowStepSchema = z.object({
  name: z.string().min(1),
  status: z.enum(["pending", "running", "completed", "failed", "skipped"]),
  startedAt: isoTimestampSchema.optional(),
  completedAt: isoTimestampSchema.optional(),
  error: z.string().optional(),
  output: z.record(z.string(), z.unknown()).optional(),
});
export type WorkflowStep = z.infer<typeof WorkflowStepSchema>;

export const DsrWorkflowStateSchema = z.object({
  dsrId: z.string().min(1),
  steps: z.array(WorkflowStepSchema),
  currentStep: z.number().int().min(0),
  startedAt: isoTimestampSchema,
  completedAt: isoTimestampSchema.optional(),
});
export type DsrWorkflowState = z.infer<typeof DsrWorkflowStateSchema>;
