// Render a VerificationReport as a formatted Markdown trust-score report.

import { renderMarkdown } from "@veritas/verification";
import type { VerificationReport } from "@veritas/contracts";
import { Verdict } from "@veritas/core";

/** Build a sample report for demonstration purposes. */
function buildSampleReport(): VerificationReport {
  return {
    schema: "veritas.report.v1",
    summary:
      "3 claims were verified. 2 were supported by credible sources, 1 was refuted. " +
      "Overall trust score: 62/100.",
    trustScore: 62,
    counts: { supported: 2, refuted: 1, unverifiable: 0 },
    claims: [
      {
        claim: "The Eiffel Tower is located in Paris, France.",
        verdict: Verdict.SUPPORTED,
        confidence: 0.99,
        reasoning:
          "Multiple authoritative sources confirm the Eiffel Tower stands on the Champ de Mars " +
          "in Paris, France. No credible contradictory evidence was found.",
        citations: [
          {
            url: "https://en.wikipedia.org/wiki/Eiffel_Tower",
            title: "Eiffel Tower — Wikipedia",
            quote: "The Eiffel Tower is a wrought-iron lattice tower on the Champ de Mars in Paris.",
            supports: true,
          },
          {
            url: "https://www.toureiffel.paris/en",
            title: "Official Eiffel Tower website",
            quote: null,
            supports: true,
          },
        ],
      },
      {
        claim:
          "Bitcoin was created by a person or group using the pseudonym Satoshi Nakamoto.",
        verdict: Verdict.SUPPORTED,
        confidence: 0.97,
        reasoning:
          "The Bitcoin white paper published in 2008 is attributed to Satoshi Nakamoto. " +
          "This is widely documented and accepted across technical and mainstream sources.",
        citations: [
          {
            url: "https://bitcoin.org/bitcoin.pdf",
            title: "Bitcoin: A Peer-to-Peer Electronic Cash System",
            quote: "Satoshi Nakamoto — Bitcoin: A Peer-to-Peer Electronic Cash System",
            supports: true,
          },
        ],
      },
      {
        claim: "The Great Wall of China is visible from the Moon with the naked eye.",
        verdict: Verdict.REFUTED,
        confidence: 0.95,
        reasoning:
          "This is a widely circulated myth. Astronauts and scientists have confirmed the wall " +
          "is far too narrow to be seen from the Moon without optical aids. " +
          "NASA has explicitly addressed and debunked this claim.",
        citations: [
          {
            url: "https://www.nasa.gov/vision/space/workinginspace/great_wall.html",
            title: "NASA — The Great Wall of China Myth",
            quote:
              "The Great Wall of China is not visible to the naked eye from the Moon or even " +
              "from low Earth orbit without aid.",
            supports: false,
          },
        ],
      },
    ],
    provenance: {
      contentHash: "sha256:a3f1e2b4c9d0e7f6a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4",
      verifier: "veritas",
      verifierVersion: "1.0.0",
      model: "claude-sonnet-4-6",
      effort: "standard",
      createdAt: new Date().toISOString(),
      claimCount: 3,
      sourceCount: 4,
    },
  };
}

/** Format a trust-score bar using ASCII blocks. */
function renderScoreBar(score: number, width = 40): string {
  const filled = Math.round((score / 100) * width);
  const bar = "█".repeat(filled) + "░".repeat(width - filled);
  return `[${bar}] ${score}/100`;
}

/** Print a concise summary header before the full Markdown body. */
function printHeader(report: VerificationReport): void {
  const { trustScore, counts } = report;
  process.stdout.write("=".repeat(60) + "\n");
  process.stdout.write("  VERITAS TRUST SCORE REPORT\n");
  process.stdout.write("=".repeat(60) + "\n");
  process.stdout.write(`  Trust Score : ${renderScoreBar(trustScore)}\n`);
  process.stdout.write(`  Supported   : ${counts.supported}\n`);
  process.stdout.write(`  Refuted     : ${counts.refuted}\n`);
  process.stdout.write(`  Unverifiable: ${counts.unverifiable}\n`);
  process.stdout.write("=".repeat(60) + "\n\n");
}

async function main(): Promise<void> {
  // Accept a JSON report from stdin or use the built-in sample.
  let report: VerificationReport;

  if (!process.stdin.isTTY) {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin as AsyncIterable<Buffer>) {
      chunks.push(chunk);
    }
    const raw = Buffer.concat(chunks).toString("utf8").trim();
    if (raw.length > 0) {
      const parsed: unknown = JSON.parse(raw);
      report = parsed as VerificationReport;
    } else {
      report = buildSampleReport();
    }
  } else {
    report = buildSampleReport();
  }

  printHeader(report);

  const markdown = renderMarkdown(report);
  process.stdout.write(markdown);
  process.stdout.write("\n");
}

main().catch((e: unknown) => {
  const msg = e instanceof Error ? e.message : String(e);
  process.stderr.write(`Error: ${msg}\n`);
  process.exit(1);
});
