// Run the verification engine end-to-end with the deterministic MockProvider — no external calls.

import { runVerification } from "@veritas/verification";
import { renderMarkdown } from "@veritas/verification";
import { MockProvider } from "@veritas/llm";
import { noopLogger, isErr } from "@veritas/core";

/** Claims to fact-check in this demonstration. */
const DEMO_CLAIMS = [
  "The Eiffel Tower is located in Paris, France.",
  "Bitcoin was created by a person or group using the pseudonym Satoshi Nakamoto.",
  "The Great Wall of China is visible from the Moon with the naked eye.",
  "Water boils at 100 degrees Celsius at standard atmospheric pressure.",
  "The Amazon River is the longest river in the world.",
];

async function main(): Promise<void> {
  process.stdout.write("[mock-verification] Starting mock verification run...\n\n");

  const llm = new MockProvider();

  const result = await runVerification(
    {
      claims: DEMO_CLAIMS,
      context: "General knowledge verification using the deterministic mock LLM provider.",
    },
    {
      llm,
      logger: noopLogger,
      concurrency: 3,
      maxClaims: DEMO_CLAIMS.length,
      maxSearchQueries: 2,
      verifier: "veritas-mock-example",
      verifierVersion: "1.0.0",
      effort: "standard",
    },
  );

  if (isErr(result)) {
    process.stderr.write(`Verification failed: ${result.error.message}\n`);
    process.exit(1);
  }

  const { report, totalTokensUsed, durationMs } = result.value;

  process.stdout.write(`Completed in ${durationMs}ms | tokens used: ${totalTokensUsed}\n`);
  process.stdout.write(`Trust score: ${report.trustScore}/100\n`);
  process.stdout.write(
    `Claims: ${report.counts.supported} supported / ` +
      `${report.counts.refuted} refuted / ` +
      `${report.counts.unverifiable} unverifiable\n\n`,
  );

  const markdown = renderMarkdown(report);
  process.stdout.write(markdown);
  process.stdout.write("\n");
}

main().catch((e: unknown) => {
  const msg = e instanceof Error ? e.message : String(e);
  process.stderr.write(`Error: ${msg}\n`);
  process.exit(1);
});
