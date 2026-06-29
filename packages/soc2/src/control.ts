// SOC2 control definition: trust-service criterion mapped to operational controls.

import { z } from "zod";
import { isoTimestampSchema } from "@veritas/core";

export const TrustServiceCategorySchema = z.enum([
  "security",
  "availability",
  "processing_integrity",
  "confidentiality",
  "privacy",
]);
export type TrustServiceCategory = z.infer<typeof TrustServiceCategorySchema>;

export const ControlTypeSchema = z.enum([
  "preventive",
  "detective",
  "corrective",
  "compensating",
]);
export type ControlType = z.infer<typeof ControlTypeSchema>;

export const ControlFrequencySchema = z.enum([
  "continuous",
  "daily",
  "weekly",
  "monthly",
  "quarterly",
  "annual",
  "event_driven",
]);
export type ControlFrequency = z.infer<typeof ControlFrequencySchema>;

export const ControlStatusSchema = z.enum([
  "active",
  "inactive",
  "under_review",
  "deprecated",
]);
export type ControlStatus = z.infer<typeof ControlStatusSchema>;

export const ControlOwnerSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  role: z.string().min(1),
});
export type ControlOwner = z.infer<typeof ControlOwnerSchema>;

export const ControlSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  category: TrustServiceCategorySchema,
  type: ControlTypeSchema,
  frequency: ControlFrequencySchema,
  status: ControlStatusSchema,
  owner: ControlOwnerSchema,
  criteriaRefs: z.array(z.string()).min(1),
  testingProcedure: z.string().min(1),
  automatable: z.boolean(),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
});
export type Control = z.infer<typeof ControlSchema>;

export const CreateControlSchema = ControlSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type CreateControl = z.infer<typeof CreateControlSchema>;

export const UpdateControlSchema = CreateControlSchema.partial();
export type UpdateControl = z.infer<typeof UpdateControlSchema>;

export const ControlSummarySchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  name: z.string().min(1),
  category: TrustServiceCategorySchema,
  status: ControlStatusSchema,
  owner: ControlOwnerSchema,
});
export type ControlSummary = z.infer<typeof ControlSummarySchema>;

/** Build a ControlSummary from a full Control. */
export function toControlSummary(control: Control): ControlSummary {
  return {
    id: control.id,
    code: control.code,
    name: control.name,
    category: control.category,
    status: control.status,
    owner: control.owner,
  };
}

/** Check whether a control is currently active. */
export function isActiveControl(control: Control): boolean {
  return control.status === "active";
}

/** Group controls by trust service category. */
export function groupControlsByCategory(
  controls: readonly Control[],
): Readonly<Record<TrustServiceCategory, Control[]>> {
  const groups: Record<TrustServiceCategory, Control[]> = {
    security: [],
    availability: [],
    processing_integrity: [],
    confidentiality: [],
    privacy: [],
  };
  for (const control of controls) {
    groups[control.category].push(control);
  }
  return groups;
}
