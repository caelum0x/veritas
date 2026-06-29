// sdk-batch-verify.ts — batch verify many items via the SDK with bounded concurrency.
import { VeritasClient } from "@veritas/sdk/client.js";
import { mapWithConcurrency } from "@veritas/core";

const API_KEY = process.env["VERITAS_API_KEY"];

if (!API_KEY) {
  process.stderr.write("Error: VERITAS_API_KEY environment variable is not set.\n");
  process.exit(1);
}

interface BatchItem {
  id: string;
  claim: string;
}

interface BatchResult {
  id: string;
  claim: string;
  verdict: string | null;
  confidence: number | null;
  error: string | null;
}

const BATCH_ITEMS: BatchItem[] = [
  { id: "c1", claim: "The Amazon River is the longest river in the world." },
  { id: "c2", claim: "DNA was first described in 1953 by Watson and Crick." },
  { id: "c3", claim: "The Earth is approximately 4.5 billion years old." },
  { id: "c4", claim: "Humans share 99% of their DNA with chimpanzees." },
  { id: "c5", claim: "The first programmable computer was invented in the 1940s." },
  { id: "c6", claim: "Penicillin was discovered by Alexander Fleming in 1928." },
  { id: "c7", claim: "The Pacific Ocean covers more than 30% of Earth's surface." },
  { id: "c8", claim: "Bats are the only mammals capable of sustained flight." },
];

async function verifyOne(
  client: VeritasClient,
  item: BatchItem,
): Promise<BatchResult> {
  try {
    const response = await client.verification.submit({
      claims: [item.claim],
    });

    if (!response.success || !response.data) {
      const errResp = response as { success: false; error?: { message?: string } };
      return {
        id: item.id,
        claim: item.claim,
        verdict: null,
        confidence: null,
        error: errResp.error?.message ?? "Request failed",
      };
    }

    const report = response.data;
    const firstClaim = report.claims[0];

    return {
      id: item.id,
      claim: item.claim,
      verdict: firstClaim?.verdict ?? null,
      confidence: firstClaim?.confidence ?? null,
      error: null,
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { id: item.id, claim: item.claim, verdict: null, confidence: null, error: msg };
  }
}

async function main(): Promise<void> {
  const client = new VeritasClient({
    apiKey: API_KEY as string,
  });

  process.stdout.write(`Batch verifying ${BATCH_ITEMS.length} claims (concurrency=3)...\n\n`);

  const startMs = Date.now();

  const results = await mapWithConcurrency(
    BATCH_ITEMS,
    3,
    (item) => verifyOne(client, item),
  );

  const elapsedMs = Date.now() - startMs;

  const succeeded = results.filter((r) => r.error === null);
  const failed = results.filter((r) => r.error !== null);

  process.stdout.write(`Completed in ${elapsedMs}ms — ${succeeded.length} ok, ${failed.length} failed\n\n`);

  for (const result of results) {
    if (result.error) {
      process.stdout.write(`  [ERROR] ${result.id}: ${result.error}\n`);
    } else {
      const pct = result.confidence !== null ? Math.round(result.confidence * 100) : "?";
      process.stdout.write(`  [${String(result.verdict).padEnd(12)}] ${pct}% — ${result.claim}\n`);
    }
  }

  if (failed.length > 0) {
    process.stderr.write(`\n${failed.length} items failed to verify.\n`);
  }
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  process.stderr.write(`Unhandled error: ${msg}\n`);
  process.exit(1);
});
