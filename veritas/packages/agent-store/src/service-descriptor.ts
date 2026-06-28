// Service descriptor: price, capability schema, and SLA for a Veritas agent service.
import { z } from "zod";
import { Usdc, Result, ok, err, ValidationError } from "@veritas/core";
import { PricingTier, PricingModel } from "./pricing-tier.js";
import { SlaSpec, DEFAULT_SLA, InputOutputSchema } from "./types.js";

export interface ServiceDescriptor {
  readonly serviceId: string;
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly pricingTierName: string;
  readonly pricingModel: PricingModel;
  readonly unitPrice: Usdc;
  readonly sla: SlaSpec;
  readonly schema: InputOutputSchema;
  readonly tags: readonly string[];
  readonly deprecated: boolean;
}

const serviceDescriptorSchema = z.object({
  serviceId: z.string().min(1),
  name: z.string().min(1).max(120),
  description: z.string().min(1).max(1000),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  pricingTierName: z.string().min(1),
  unitPriceMicroUsdc: z.bigint().nonnegative(),
  sla: z
    .object({
      uptimePercent: z.number().min(0).max(100),
      p95LatencyMs: z.number().positive(),
      maxRetries: z.number().int().nonnegative(),
      timeoutMs: z.number().positive(),
    })
    .optional(),
  tags: z.array(z.string()).default([]),
  deprecated: z.boolean().default(false),
});

export interface ServiceDescriptorInput {
  readonly serviceId: string;
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly tier: PricingTier;
  readonly schema: InputOutputSchema;
  readonly sla?: Partial<SlaSpec>;
  readonly tags?: readonly string[];
  readonly deprecated?: boolean;
}

export function buildServiceDescriptor(
  input: ServiceDescriptorInput
): Result<ServiceDescriptor, ValidationError> {
  const parsed = serviceDescriptorSchema.safeParse({
    serviceId: input.serviceId,
    name: input.name,
    description: input.description,
    version: input.version,
    pricingTierName: input.tier.name,
    unitPriceMicroUsdc: input.tier.unitPrice.baseUnits,
    sla: input.sla,
    tags: input.tags ?? [],
    deprecated: input.deprecated ?? false,
  });

  if (!parsed.success) {
    return err(
      new ValidationError({
        message: "Invalid service descriptor",
        issues: [{ path: "descriptor", message: parsed.error.message }],
      })
    );
  }

  const sla: SlaSpec = {
    ...DEFAULT_SLA,
    ...(input.sla ?? {}),
  };

  return ok({
    serviceId: parsed.data.serviceId,
    name: parsed.data.name,
    description: parsed.data.description,
    version: parsed.data.version,
    pricingTierName: parsed.data.pricingTierName,
    pricingModel: input.tier.model,
    unitPrice: input.tier.unitPrice,
    sla,
    schema: input.schema,
    tags: parsed.data.tags,
    deprecated: parsed.data.deprecated,
  });
}
