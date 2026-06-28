// Registration payloads and logic for adding agents and services to the store.
import { z } from "zod";
import { Result, ok, err, ValidationError, isOk } from "@veritas/core";
import { ServiceDescriptor, buildServiceDescriptor } from "./service-descriptor.js";
import { Listing, createListing, publishListing } from "./listing.js";
import { findTierByName } from "./pricing-tier.js";
import { InputOutputSchema, SlaSpec } from "./types.js";

export interface AgentRegistrationInput {
  readonly agentDid: string;
  readonly walletAddress: string;
  readonly serviceName: string;
  readonly serviceDescription: string;
  readonly serviceVersion: string;
  readonly serviceId: string;
  readonly pricingTierName: string;
  readonly schema: InputOutputSchema;
  readonly sla?: Partial<SlaSpec>;
  readonly tags?: readonly string[];
}

const agentRegistrationSchema = z.object({
  agentDid: z.string().min(8),
  walletAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  serviceName: z.string().min(1).max(120),
  serviceDescription: z.string().min(1).max(1000),
  serviceVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  serviceId: z.string().min(1),
  pricingTierName: z.string().min(1),
});

export interface AgentRegistrationResult {
  readonly descriptor: ServiceDescriptor;
  readonly listing: Listing;
}

export function registerAgent(
  input: AgentRegistrationInput
): Result<AgentRegistrationResult, ValidationError> {
  const parsed = agentRegistrationSchema.safeParse(input);
  if (!parsed.success) {
    return err(
      new ValidationError({
        message: "Invalid agent registration input",
        issues: [{ path: "registration", message: parsed.error.message }],
      })
    );
  }

  const tier = findTierByName(input.pricingTierName);
  if (!tier) {
    return err(
      new ValidationError({
        message: "Unknown pricing tier",
        issues: [{ path: "pricingTierName", message: `Tier '${input.pricingTierName}' not found` }],
      })
    );
  }

  const descriptorResult = buildServiceDescriptor({
    serviceId: input.serviceId,
    name: input.serviceName,
    description: input.serviceDescription,
    version: input.serviceVersion,
    tier,
    schema: input.schema,
    sla: input.sla,
    tags: input.tags,
  });

  if (!isOk(descriptorResult)) return descriptorResult;
  const descriptor = descriptorResult.value;

  const listingResult = createListing({
    agentDid: input.agentDid,
    walletAddress: input.walletAddress,
    descriptor,
  });

  if (!isOk(listingResult)) return listingResult;

  const publishResult = publishListing(listingResult.value);
  if (!isOk(publishResult)) return publishResult;

  return ok({ descriptor, listing: publishResult.value });
}

export interface ServiceUpdateInput {
  readonly listing: Listing;
  readonly description?: string;
  readonly tags?: readonly string[];
  readonly sla?: Partial<SlaSpec>;
}

export function updateServiceListing(
  input: ServiceUpdateInput
): Result<Listing, ValidationError> {
  const { listing, description, tags } = input;

  if (listing.status === "retired") {
    return err(
      new ValidationError({
        message: "Cannot update a retired listing",
        issues: [{ path: "status", message: "Listing is retired" }],
      })
    );
  }

  const updatedDescriptor: typeof listing.descriptor = {
    ...listing.descriptor,
    description: description ?? listing.descriptor.description,
    tags: tags ?? listing.descriptor.tags,
  };

  return ok({
    ...listing,
    descriptor: updatedDescriptor,
  });
}
