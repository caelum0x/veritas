// SLA definition: core SLA entity with targets and policy references.
import { z } from "zod";
import { newId } from "@veritas/core";

export const SlaStatusSchema = z.enum(["active", "suspended", "expired"]);
export type SlaStatus = z.infer<typeof SlaStatusSchema>;

export const SlaSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  organizationId: z.string(),
  serviceId: z.string(),
  policyId: z.string().optional(),
  status: SlaStatusSchema,
  targetIds: z.array(z.string()),
  effectiveFrom: z.string(),
  effectiveTo: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Sla = z.infer<typeof SlaSchema>;

export const CreateSlaSchema = SlaSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type CreateSla = z.infer<typeof CreateSlaSchema>;

export function makeSla(input: CreateSla): Sla {
  const now = new Date().toISOString();
  return {
    ...input,
    id: newId("sla"),
    createdAt: now,
    updatedAt: now,
  };
}

export function updateSla(
  sla: Sla,
  patch: Partial<Omit<Sla, "id" | "createdAt">>
): Sla {
  return { ...sla, ...patch, updatedAt: new Date().toISOString() };
}

export function isSlaActive(sla: Sla, at: string = new Date().toISOString()): boolean {
  if (sla.status !== "active") return false;
  if (at < sla.effectiveFrom) return false;
  if (sla.effectiveTo !== undefined && at > sla.effectiveTo) return false;
  return true;
}
