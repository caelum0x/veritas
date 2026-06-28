// Hire Veritas over CAP (A2A), settle USDC on Base, and read the verification report.

import { VeritasClient } from "@veritas/sdk/client.js";
import { capHire } from "@veritas/sdk/a2a/cap-hire.js";
import type { HireResult } from "@veritas/sdk";

/** Environment-driven configuration for the CAP hire demo. */
interface HireConfig {
  readonly apiBase: string;
  readonly apiKey: string;
  readonly serviceId: string;
  readonly buyerAddress: string;
  readonly amountUsdc: string;
  readonly claim: string;
  readonly pollIntervalMs: number;
  readonly timeoutMs: number;
}

function loadHireConfig(): HireConfig {
  const get = (key: string, fallback?: string): string => {
    const v = process.env[key] ?? fallback;
    if (v === undefined) throw new Error(`Missing required env var: ${key}`);
    return v;
  };

  return {
    apiBase: get("VERITAS_API_BASE", "https://api.veritas.croo.app"),
    apiKey: get("VERITAS_API_KEY"),
    serviceId: get("VERITAS_SERVICE_ID", "veritas-standard"),
    buyerAddress: get("BUYER_WALLET_ADDRESS"),
    amountUsdc: get("HIRE_AMOUNT_USDC", "1000000"),
    claim: get(
      "CLAIM_TEXT",
      "The Eiffel Tower is located in Berlin, Germany, and was built in 1912.",
    ),
    pollIntervalMs: parseInt(get("POLL_INTERVAL_MS", "4000"), 10),
    timeoutMs: parseInt(get("HIRE_TIMEOUT_MS", "300000"), 10),
  };
}

function printHireResult(result: HireResult): void {
  console.log("\n=== CAP Hire Complete ===");
  console.log(`Order ID   : ${result.order.id}`);
  console.log(`Order Status: ${result.order.status}`);

  if (result.delivery) {
    console.log(`Delivery ID: ${result.delivery.id}`);
    console.log(`Delivered  : ${result.delivery.deliveredAt ?? "(unknown)"}`);
  } else {
    console.log("Delivery   : none");
  }

  if (result.report) {
    const r = result.report;
    console.log("\n--- Verification Report ---");
    console.log(`Trust Score: ${r.trustScore}/100`);
    console.log(`Confidence : ${(r.trustScore / 100 * 100).toFixed(1)}%`);
    console.log(`Claims     : ${r.claims.length} processed`);
    const allCitations = r.claims.flatMap((c) => c.citations);
    console.log(`Citations  : ${allCitations.length} found`);
    console.log(`Summary    : ${r.summary}`);
    for (const claim of r.claims) {
      console.log(`  [${claim.verdict.padEnd(10)}] ${claim.claim.slice(0, 80)}`);
    }
  } else {
    console.log("Report     : not available");
  }
}

async function main(): Promise<void> {
  const cfg = loadHireConfig();

  console.log("=== Veritas CAP Hire Demo ===");
  console.log(`API Base  : ${cfg.apiBase}`);
  console.log(`Service ID: ${cfg.serviceId}`);
  console.log(`Claim     : ${cfg.claim}`);
  console.log(`Amount    : ${cfg.amountUsdc} USDC (micro)`);

  const client = new VeritasClient({ apiKey: cfg.apiKey, baseUrl: cfg.apiBase });

  console.log("\nCreating order and waiting for delivery...");

  const result = await capHire(client.transport, {
    serviceId: cfg.serviceId,
    claim: cfg.claim,
    amountUsdc: cfg.amountUsdc,
    buyerAddress: cfg.buyerAddress,
    completion: {
      pollIntervalMs: cfg.pollIntervalMs,
      timeoutMs: cfg.timeoutMs,
      onPoll: (order: import("@veritas/sdk").Order) => {
        process.stdout.write(`  Polling — status: ${order.status}   \r`);
      },
    },
  });

  printHireResult(result);
}

main().catch((err: unknown) => {
  console.error("hire-via-cap failed:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
