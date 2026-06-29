// verify-claims.ts — verify a list of explicit claims with the engine directly.
import { runVerification } from "@veritas/verification";
import { MockProvider } from "@veritas/llm";
import { isOk, isErr, noopLogger } from "@veritas/core";
import type { EngineOptions } from "@veritas/verification";

const CLAIMS: readonly string[] = [
  "The Great Wall of China is visible from space with the naked eye.",
  "The human body contains more bacterial cells than human cells.",
  "Lightning never strikes the same place twice.",
];

async function main(): Promise<void> {
  const options: EngineOptions = {
    llm: new MockProvider(),
    logger: noopLogger,
    concurrency: 3,
    maxClaims: 20,
    effort: "standard",
    verifier: "veritas-example",
    verifierVersion: "1.0.0",
  };

  const request = {
    claims: CLAIMS as string[],
    options: {
      effort: "standard" as const,
    },
  };

  process.stdout.write(`Verifying ${CLAIMS.length} claims...\n`);

  const result = await runVerification(request, options);

  if (isErr(result)) {
    process.stderr.write(`Verification failed: [${result.error.code}] ${result.error.message}\n`);
    process.exit(1);
  }

  const { report, totalTokensUsed, durationMs } = result.value;

  process.stdout.write(`\nVerification complete in ${durationMs}ms (${totalTokensUsed} tokens)\n`);
  process.stdout.write(`Trust score: ${report.trustScore}/100\n`);
  process.stdout.write(`Verifier: ${report.provenance.verifierVersion}\n\n`);

  for (const claim of report.claims) {
    const pct = Math.round(claim.confidence * 100);
    process.stdout.write(`  [${claim.verdict}] (${pct}%) ${claim.claim}\n`);
    if (claim.reasoning) {
      process.stdout.write(`    → ${claim.reasoning}\n`);
    }
  }

  const totalCitations = report.claims.reduce((n, c) => n + c.citations.length, 0);
  process.stdout.write(`\nCitations: ${totalCitations}\n`);
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  process.stderr.write(`Unhandled error: ${msg}\n`);
  process.exit(1);
});
