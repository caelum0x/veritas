// Build and print the Veritas agent-store listing manifest for CAP registration.

import {
  buildServiceDescriptor,
  createListing,
  publishListing,
  buildManifest,
  serializeManifest,
  manifestSummary,
  PRO_TIER,
  ENTERPRISE_TIER,
} from "@veritas/agent-store";
import { isErr, newId } from "@veritas/core";

/** JSON Schema fragment for a VerificationRequest input. */
const VERIFICATION_REQUEST_SCHEMA = {
  type: "object",
  required: ["claims"],
  properties: {
    claims: {
      type: "array",
      items: { type: "string" },
      description: "List of factual claims to verify.",
    },
    text: {
      type: "string",
      description: "Free-form text from which claims are extracted automatically.",
    },
    context: {
      type: "string",
      description: "Optional context string to guide adjudication.",
    },
  },
} as const;

/** JSON Schema fragment for a VerificationReport output. */
const VERIFICATION_REPORT_SCHEMA = {
  type: "object",
  required: ["schema", "trustScore", "counts", "claims", "provenance"],
  properties: {
    schema: { type: "string", const: "veritas.report.v1" },
    trustScore: { type: "number", minimum: 0, maximum: 100 },
    counts: {
      type: "object",
      properties: {
        supported: { type: "integer" },
        refuted: { type: "integer" },
        unverifiable: { type: "integer" },
      },
    },
    claims: { type: "array", items: { type: "object" } },
    provenance: { type: "object" },
  },
} as const;

async function main(): Promise<void> {
  const agentDid = process.env["VERITAS_AGENT_DID"] ?? `did:veritas:agent:${newId("agent")}`;
  const walletAddress =
    process.env["VERITAS_WALLET_ADDRESS"] ?? "0xDeAdBeEf0000000000000000000000000000dEaD";

  // Build pro-tier service descriptor.
  const proDescriptorResult = buildServiceDescriptor({
    serviceId: "veritas-verify-pro",
    name: "Veritas Fact Verification (Pro)",
    description:
      "Production-grade fact-verification service with confidence scores, citations, " +
      "and full provenance attestation. Powered by the Veritas engine on Base L2.",
    version: "1.0.0",
    tier: PRO_TIER,
    schema: {
      inputSchema: VERIFICATION_REQUEST_SCHEMA,
      outputSchema: VERIFICATION_REPORT_SCHEMA,
    },
    sla: { p95LatencyMs: 3000, uptimePercent: 99.5, maxRetries: 3, timeoutMs: 30_000 },
    tags: ["fact-check", "provenance", "nlp", "trust-score"],
  });

  if (isErr(proDescriptorResult)) {
    process.stderr.write(`Failed to build pro descriptor: ${proDescriptorResult.error.message}\n`);
    process.exit(1);
  }

  // Build enterprise-tier service descriptor.
  const enterpriseDescriptorResult = buildServiceDescriptor({
    serviceId: "veritas-verify-enterprise",
    name: "Veritas Fact Verification (Enterprise)",
    description:
      "High-throughput fact-verification with custom source lists, SLA guarantees, " +
      "and dedicated support. Priced per-call with volume discounts via tiered model.",
    version: "1.0.0",
    tier: ENTERPRISE_TIER,
    schema: {
      inputSchema: VERIFICATION_REQUEST_SCHEMA,
      outputSchema: VERIFICATION_REPORT_SCHEMA,
    },
    sla: { p95LatencyMs: 1500, uptimePercent: 99.9, maxRetries: 5, timeoutMs: 20_000 },
    tags: ["fact-check", "provenance", "enterprise", "sla", "custom-sources"],
  });

  if (isErr(enterpriseDescriptorResult)) {
    process.stderr.write(`Failed to build enterprise descriptor: ${enterpriseDescriptorResult.error.message}\n`);
    process.exit(1);
  }

  // Create and publish listings.
  const proListingResult = createListing({
    agentDid,
    walletAddress,
    descriptor: proDescriptorResult.value,
  });

  if (isErr(proListingResult)) {
    process.stderr.write(`Failed to create pro listing: ${proListingResult.error.message}\n`);
    process.exit(1);
  }

  const proPublishedResult = publishListing(proListingResult.value);
  if (isErr(proPublishedResult)) {
    process.stderr.write(`Failed to publish pro listing: ${proPublishedResult.error.message}\n`);
    process.exit(1);
  }

  const enterpriseListingResult = createListing({
    agentDid,
    walletAddress,
    descriptor: enterpriseDescriptorResult.value,
  });

  if (isErr(enterpriseListingResult)) {
    process.stderr.write(`Failed to create enterprise listing: ${enterpriseListingResult.error.message}\n`);
    process.exit(1);
  }

  const enterprisePublishedResult = publishListing(enterpriseListingResult.value);
  if (isErr(enterprisePublishedResult)) {
    process.stderr.write(`Failed to publish enterprise listing: ${enterprisePublishedResult.error.message}\n`);
    process.exit(1);
  }

  // Assemble the manifest from both active listings.
  const manifestResult = buildManifest({
    agentDid,
    walletAddress,
    listings: [proPublishedResult.value, enterprisePublishedResult.value],
  });

  if (isErr(manifestResult)) {
    process.stderr.write(`Failed to build manifest: ${manifestResult.error.message}\n`);
    process.exit(1);
  }

  const manifest = manifestResult.value;

  process.stdout.write(`${manifestSummary(manifest)}\n\n`);
  process.stdout.write(serializeManifest(manifest));
  process.stdout.write("\n");
}

main().catch((e: unknown) => {
  const msg = e instanceof Error ? e.message : String(e);
  process.stderr.write(`Error: ${msg}\n`);
  process.exit(1);
});
