// ReportsGet command — retrieve a single persisted verification report by ID
import type { Command, CommandContext } from "../command.js";
import { printJson, printTable, printLine, printError, printSuccess } from "../output.js";
import { loadCliConfig } from "../config.js";
import { VeritasClient } from "@veritas/sdk/client.js";
import type { JsonValue } from "@veritas/core";

export class ReportsGetCommand implements Command {
  readonly name = "reports-get";
  readonly aliases = ["rg"];
  readonly description = "Retrieve a single verification report by ID";
  readonly usage = "reports-get <report-id> [--json]";
  readonly examples = [
    "reports-get rpt_abc123",
    "reports-get rpt_abc123 --json",
  ];

  async run(ctx: CommandContext): Promise<void> {
    const reportId = ctx.args[0];
    if (!reportId) {
      printError("Report ID argument is required. Usage: " + this.usage);
      process.exit(1);
    }

    const config = loadCliConfig();
    if (!config.apiKey) {
      printError("VERITAS_API_KEY environment variable is required");
      process.exit(1);
    }

    const client = new VeritasClient({ apiKey: config.apiKey, baseUrl: config.apiUrl });

    let response: Awaited<ReturnType<typeof client.reports.get>>;
    try {
      response = await client.reports.get(reportId);
    } catch (err: unknown) {
      printError(err instanceof Error ? err.message : "Failed to retrieve report");
      process.exit(1);
    }

    if (!response.success || !response.data) {
      const failure = response as { error?: { message?: string } };
      printError(failure.error?.message ?? "Report not found");
      process.exit(1);
    }

    const report = response.data;

    if (ctx.outputJson) {
      printJson(report as unknown as JsonValue);
      return;
    }

    printSuccess(`Report: ${report.id}`);
    printLine(`Verification: ${report.verificationId}`);
    printLine(`Trust score : ${report.trustScore}/100`);
    printLine(`Summary     : ${report.summary}`);
    printLine(`Created     : ${report.createdAt}`);
    printLine(`Claims      : ${report.counts.supported} supported, ${report.counts.refuted} refuted, ${report.counts.unverifiable} unverifiable`);

    if (report.claims.length > 0) {
      printLine("");
      printTable(
        report.claims.map((c) => ({
          verdict: c.verdict,
          confidence: `${Math.round(c.confidence * 100)}%`,
          claim: c.claim.slice(0, 80),
        })),
      );
    }

    printLine("");
    printLine(`Provenance  : ${report.provenance.verifier} v${report.provenance.verifierVersion}`);
    printLine(`Model       : ${report.provenance.model} (${report.provenance.effort})`);
    printLine(`Content hash: ${report.contentHash}`);
  }
}
