// Cost event: domain event emitted whenever a cost is incurred by a tenant/feature
import { z } from "zod";
import { newId, type Id, type IsoTimestamp, epochToIso } from "@veritas/core";

export const CostEventKindSchema = z.enum([
  "llm_inference",
  "infra_compute",
  "infra_storage",
  "infra_egress",
  "third_party_api",
  "agent_execution",
]);
export type CostEventKind = z.infer<typeof CostEventKindSchema>;

export const CostEventSchema = z.object({
  id: z.string(),
  kind: CostEventKindSchema,
  tenantId: z.string(),
  featureId: z.string(),
  amountUsdc: z.number().nonnegative(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  occurredAt: z.string(),
});
export type CostEvent = z.infer<typeof CostEventSchema>;

export interface CreateCostEventInput {
  readonly kind: CostEventKind;
  readonly tenantId: string;
  readonly featureId: string;
  readonly amountUsdc: number;
  readonly metadata?: Record<string, unknown>;
  readonly occurredAt?: IsoTimestamp;
}

export function makeCostEvent(input: CreateCostEventInput): CostEvent {
  return CostEventSchema.parse({
    id: newId("cost"),
    kind: input.kind,
    tenantId: input.tenantId,
    featureId: input.featureId,
    amountUsdc: input.amountUsdc,
    metadata: input.metadata ?? {},
    occurredAt: input.occurredAt ?? epochToIso(Date.now()),
  });
}
