// Build the Veritas service manifest describing agent capabilities for CAP negotiation.
import { z } from "zod";
import { newId, Result, ok, err, ValidationError, IsoTimestamp, epochToIso } from "@veritas/core";
import { ServiceDescriptor } from "./service-descriptor.js";
import { Listing } from "./listing.js";
import { ManifestId, SlaSpec } from "./types.js";
import { PricingTier } from "./pricing-tier.js";

export interface ManifestEndpoint {
  readonly path: string;
  readonly method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  readonly description: string;
  readonly inputSchema: Record<string, unknown>;
  readonly outputSchema: Record<string, unknown>;
}

export interface ServiceManifest {
  readonly id: ManifestId;
  readonly agentDid: string;
  readonly walletAddress: string;
  readonly services: readonly ManifestService[];
  readonly generatedAt: IsoTimestamp;
  readonly schemaVersion: "1.0";
}

export interface ManifestService {
  readonly serviceId: string;
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly pricingTierName: string;
  readonly pricingModel: string;
  readonly unitPriceMicroUsdc: string;
  readonly sla: SlaSpec;
  readonly endpoints: readonly ManifestEndpoint[];
  readonly tags: readonly string[];
  readonly deprecated: boolean;
}

const buildManifestSchema = z.object({
  agentDid: z.string().min(1),
  walletAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
});

function descriptorToManifestService(descriptor: ServiceDescriptor): ManifestService {
  const inputEndpoint: ManifestEndpoint = {
    path: `/services/${descriptor.serviceId}/verify`,
    method: "POST",
    description: `Submit a verification request to ${descriptor.name}`,
    inputSchema: descriptor.schema.inputSchema,
    outputSchema: descriptor.schema.outputSchema,
  };

  const statusEndpoint: ManifestEndpoint = {
    path: `/services/${descriptor.serviceId}/jobs/:jobId`,
    method: "GET",
    description: `Poll job status for ${descriptor.name}`,
    inputSchema: { jobId: { type: "string" } },
    outputSchema: { status: { type: "string" }, result: { type: "object" } },
  };

  return {
    serviceId: descriptor.serviceId,
    name: descriptor.name,
    description: descriptor.description,
    version: descriptor.version,
    pricingTierName: descriptor.pricingTierName,
    pricingModel: descriptor.pricingModel,
    unitPriceMicroUsdc: descriptor.unitPrice.baseUnits.toString(),
    sla: descriptor.sla,
    endpoints: [inputEndpoint, statusEndpoint],
    tags: descriptor.tags,
    deprecated: descriptor.deprecated,
  };
}

export interface BuildManifestInput {
  readonly agentDid: string;
  readonly walletAddress: string;
  readonly listings: readonly Listing[];
}

export function buildManifest(
  input: BuildManifestInput
): Result<ServiceManifest, ValidationError> {
  const parsed = buildManifestSchema.safeParse({
    agentDid: input.agentDid,
    walletAddress: input.walletAddress,
  });

  if (!parsed.success) {
    return err(
      new ValidationError({
        message: "Invalid manifest input",
        issues: [{ path: "manifest", message: parsed.error.message }],
      })
    );
  }

  const activeListings = input.listings.filter((l) => l.status === "active");

  if (activeListings.length === 0) {
    return err(
      new ValidationError({
        message: "Cannot build manifest with no active listings",
        issues: [{ path: "listings", message: "At least one active listing is required" }],
      })
    );
  }

  const services = activeListings.map((l) => descriptorToManifestService(l.descriptor));

  return ok({
    id: newId("manifest") as ManifestId,
    agentDid: parsed.data.agentDid,
    walletAddress: parsed.data.walletAddress,
    services,
    generatedAt: epochToIso(Date.now()),
    schemaVersion: "1.0",
  });
}

export function serializeManifest(manifest: ServiceManifest): string {
  return JSON.stringify(manifest, null, 2);
}

export function manifestSummary(manifest: ServiceManifest): string {
  const count = manifest.services.length;
  const names = manifest.services.map((s) => s.name).join(", ");
  return `Manifest ${manifest.id} for agent ${manifest.agentDid}: ${count} service(s) [${names}] generated at ${manifest.generatedAt}`;
}
