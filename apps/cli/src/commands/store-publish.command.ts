// StorePublish command: register and publish an agent service to the Veritas agent store
import { isErr } from "@veritas/core";
import {
  registerAgent,
  buildManifest,
  serializeManifest,
  manifestSummary,
  ALL_TIERS,
} from "@veritas/agent-store";
import type { Command, CommandContext } from "../command.js";
import { printJson, printLine, printError, printSuccess } from "../output.js";
import { createSpinner } from "../spinner.js";

function flag(flags: CommandContext["flags"], key: string): string | undefined {
  const v = flags[key];
  return typeof v === "string" ? v : undefined;
}

function requiredFlag(flags: CommandContext["flags"], key: string): string {
  const v = flag(flags, key);
  if (!v) throw new Error(`Missing required flag --${key}`);
  return v;
}

function parseSlaInt(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const n = parseInt(value, 10);
  return isNaN(n) ? undefined : n;
}

function parseTags(raw: string | undefined): readonly string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

export const storePublishCommand: Command = {
  name: "store:publish",
  aliases: ["store-publish"],
  description: "Register and publish an agent service listing to the Veritas agent store",
  usage: "veritas store:publish --agent-did <did> --wallet <addr> --service-id <id> --name <n> --description <d> --version <v> --tier <tier>",
  examples: [
    "veritas store:publish --agent-did did:veritas:agent:abc123 --wallet 0xDEAD...BEEF --service-id my-service --name 'My Service' --description 'Does X' --version 1.0.0 --tier pro",
    "veritas store:publish --agent-did did:veritas:agent:abc123 --wallet 0xDEAD...BEEF --service-id my-svc --name 'My Svc' --description 'Does Y' --version 2.0.0 --tier enterprise --tags nlp,trust",
  ],

  async run(ctx: CommandContext): Promise<void> {
    const { flags, logger } = ctx;

    if (flags["help"] === true) {
      printLine("Usage: " + storePublishCommand.usage);
      printLine("");
      printLine("Options:");
      printLine("  --agent-did     Agent DID (required)");
      printLine("  --wallet        Wallet address 0x... (required)");
      printLine("  --service-id    Unique service identifier (required)");
      printLine("  --name          Human-readable service name (required)");
      printLine("  --description   Service description (required)");
      printLine("  --version       Semver version e.g. 1.0.0 (required)");
      printLine(`  --tier          Pricing tier: ${ALL_TIERS.map((t) => t.name).join(" | ")} (required)`);
      printLine("  --tags          Comma-separated tags (optional)");
      printLine("  --sla-uptime    SLA uptime percent e.g. 99.5 (optional)");
      printLine("  --sla-p95       SLA p95 latency ms (optional)");
      printLine("  --sla-retries   SLA max retries (optional)");
      printLine("  --sla-timeout   SLA timeout ms (optional)");
      return;
    }

    let agentDid: string;
    let walletAddress: string;
    let serviceId: string;
    let serviceName: string;
    let serviceDescription: string;
    let serviceVersion: string;
    let pricingTierName: string;

    try {
      agentDid = requiredFlag(flags, "agent-did");
      walletAddress = requiredFlag(flags, "wallet");
      serviceId = requiredFlag(flags, "service-id");
      serviceName = requiredFlag(flags, "name");
      serviceDescription = requiredFlag(flags, "description");
      serviceVersion = requiredFlag(flags, "version");
      pricingTierName = requiredFlag(flags, "tier");
    } catch (e: unknown) {
      printError(e instanceof Error ? e.message : String(e));
      process.exit(1);
    }

    const tags = parseTags(flag(flags, "tags"));
    const slaUptimeRaw = flag(flags, "sla-uptime");
    const sla: Record<string, number | undefined> = {
      uptimePercent: slaUptimeRaw !== undefined ? parseFloat(slaUptimeRaw) : undefined,
      p95LatencyMs: parseSlaInt(flag(flags, "sla-p95")),
      maxRetries: parseSlaInt(flag(flags, "sla-retries")),
      timeoutMs: parseSlaInt(flag(flags, "sla-timeout")),
    };

    const slaPartial: Partial<{ uptimePercent: number; p95LatencyMs: number; maxRetries: number; timeoutMs: number }> = {};
    if (sla["uptimePercent"] !== undefined) slaPartial.uptimePercent = sla["uptimePercent"];
    if (sla["p95LatencyMs"] !== undefined) slaPartial.p95LatencyMs = sla["p95LatencyMs"];
    if (sla["maxRetries"] !== undefined) slaPartial.maxRetries = sla["maxRetries"];
    if (sla["timeoutMs"] !== undefined) slaPartial.timeoutMs = sla["timeoutMs"];

    const spinner = createSpinner("Publishing to agent store...");
    spinner.start();

    const registrationResult = registerAgent({
      agentDid,
      walletAddress,
      serviceName,
      serviceDescription,
      serviceVersion,
      serviceId,
      pricingTierName,
      schema: {
        inputSchema: { type: "object" },
        outputSchema: { type: "object" },
      },
      sla: Object.keys(slaPartial).length > 0 ? slaPartial : undefined,
      tags,
    });

    if (isErr(registrationResult)) {
      spinner.fail("Registration failed");
      printError(registrationResult.error.message);
      logger.error("store:publish registration failed", { error: registrationResult.error });
      process.exit(1);
    }

    const { listing } = registrationResult.value;

    const manifestResult = buildManifest({
      agentDid,
      walletAddress,
      listings: [listing],
    });

    if (isErr(manifestResult)) {
      spinner.fail("Manifest build failed");
      printError(manifestResult.error.message);
      logger.error("store:publish manifest build failed", { error: manifestResult.error });
      process.exit(1);
    }

    const manifest = manifestResult.value;
    spinner.succeed("Published successfully");

    if (ctx.outputJson) {
      printJson({
        listingId: listing.id,
        agentDid: listing.agentDid,
        walletAddress: listing.walletAddress,
        serviceId: listing.descriptor.serviceId,
        serviceName: listing.descriptor.name,
        version: listing.descriptor.version,
        pricingTier: listing.descriptor.pricingTierName,
        status: listing.status,
        publishedAt: listing.publishedAt,
        manifestId: manifest.id,
        manifestSummary: manifestSummary(manifest),
        manifest: JSON.parse(serializeManifest(manifest)) as import("@veritas/core").JsonValue,
      });
      return;
    }

    printSuccess(`Listing published: ${listing.id}`);
    printLine(`  Service ID  : ${listing.descriptor.serviceId}`);
    printLine(`  Name        : ${listing.descriptor.name}`);
    printLine(`  Version     : ${listing.descriptor.version}`);
    printLine(`  Tier        : ${listing.descriptor.pricingTierName}`);
    printLine(`  Status      : ${listing.status}`);
    printLine(`  Published At: ${listing.publishedAt ?? "—"}`);
    printLine(`  Manifest ID : ${manifest.id}`);
    if (tags.length > 0) {
      printLine(`  Tags        : ${tags.join(", ")}`);
    }
    printLine("");
    printLine(manifestSummary(manifest));
  },
};
