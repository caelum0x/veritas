// verify-text.ts — fact-check a block of generated text using the verification engine.
import { runVerification } from "@veritas/verification";
import { MockProvider } from "@veritas/llm";
import { isErr, noopLogger } from "@veritas/core";
import type { EngineOptions } from "@veritas/verification";

const SAMPLE_TEXT = `
  Scientists have confirmed that the human brain uses only 10% of its capacity at any given time.
  Researchers at MIT recently proved that drinking eight glasses of water per day is essential for health.
  Mount Everest is the tallest mountain on Earth, standing at 8,848 meters above sea level.
  The Great Fire of London in 1666 destroyed most of the city and killed thousands of people.
  Albert Einstein failed mathematics in school before going on to develop the theory of relativity.
`.trim();

async function main(): Promise<void> {
  const options: EngineOptions = {
    llm: new MockProvider(),
    logger: noopLogger,
    concurrency: 4,
    maxClaims: 10,
    effort: "high",
    verifier: "veritas-example",
    verifierVersion: "1.0.0",
  };

  const request = {
    text: SAMPLE_TEXT,
    options: {
      effort: "high" as const,
    },
  };

  process.stdout.write("Fact-checking generated text...\n");
  process.stdout.write(`Input length: ${SAMPLE_TEXT.length} chars\n\n`);

  const startMs = Date.now();
  const result = await runVerification(request, options);
  const elapsedMs = Date.now() - startMs;

  if (isErr(result)) {
    process.stderr.write(`Verification failed: [${result.error.code}] ${result.error.message}\n`);
    process.exit(1);
  }

  const { report, totalTokensUsed } = result.value;

  process.stdout.write(`Done in ${elapsedMs}ms — ${totalTokensUsed} tokens consumed\n`);
  process.stdout.write(`Claims extracted: ${report.claims.length}\n`);
  process.stdout.write(`Trust score: ${report.trustScore}/100\n\n`);

  const verdictCounts: Record<string, number> = {};
  for (const claim of report.claims) {
    verdictCounts[claim.verdict] = (verdictCounts[claim.verdict] ?? 0) + 1;
    const pct = Math.round(claim.confidence * 100);
    process.stdout.write(`  [${claim.verdict.padEnd(12)}] ${pct}% — ${claim.claim}\n`);
  }

  process.stdout.write("\nVerdict breakdown:\n");
  for (const [verdict, count] of Object.entries(verdictCounts)) {
    process.stdout.write(`  ${verdict}: ${count}\n`);
  }
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  process.stderr.write(`Unhandled error: ${msg}\n`);
  process.exit(1);
});
