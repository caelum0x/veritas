// sdk-quickstart.ts — minimal example: use @veritas/sdk to submit a claim and print results.
import { VeritasClient } from "@veritas/sdk/client.js";

const API_KEY = process.env["VERITAS_API_KEY"];

if (!API_KEY) {
  process.stderr.write("Error: VERITAS_API_KEY environment variable is not set.\n");
  process.exit(1);
}

async function main(): Promise<void> {
  const client = new VeritasClient({
    apiKey: API_KEY as string,
  });

  const claim = "The speed of light in a vacuum is approximately 299,792 kilometres per second.";

  process.stdout.write(`Submitting claim for verification:\n  "${claim}"\n\n`);

  const response = await client.verification.submit({
    claims: [claim],
  });

  if (!response.success || !response.data) {
    const errResp = response as { success: false; error?: { message?: string } };
    const msg = errResp.error?.message ?? "Unknown error";
    process.stderr.write(`Verification request failed: ${msg}\n`);
    process.exit(1);
  }

  const report = response.data;

  process.stdout.write(`Verification ID: ${report.provenance.contentHash}\n`);
  process.stdout.write(`Overall summary: ${report.summary}\n`);
  process.stdout.write(`Claims checked: ${report.claims.length}\n\n`);

  const allCitations: Array<{ url: string; title: string | null }> = [];

  for (const c of report.claims) {
    const pct = Math.round(c.confidence * 100);
    process.stdout.write(`  [${c.verdict}] (${pct}%) ${c.claim}\n`);
    if (c.reasoning) {
      process.stdout.write(`    Reasoning: ${c.reasoning}\n`);
    }
    for (const cite of c.citations) {
      allCitations.push(cite);
    }
  }

  if (allCitations.length > 0) {
    process.stdout.write(`\nTop citations:\n`);
    for (const cite of allCitations.slice(0, 3)) {
      process.stdout.write(`  - ${cite.title ?? cite.url}\n    ${cite.url}\n`);
    }
  }
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  process.stderr.write(`Unhandled error: ${msg}\n`);
  process.exit(1);
});
