// Verify command — submit claims or text for fact-verification and display the resulting report
import type { Command, CommandContext } from "../command.js";
import { printJson, printTable, printLine, printError, printSuccess } from "../output.js";
import { loadCliConfig } from "../config.js";
import { VeritasClient } from "@veritas/sdk/client.js";
import type { JsonValue } from "@veritas/core";

export class VerifyCommand implements Command {
  readonly name = "verify";
  readonly aliases = ["v"];
  readonly description = "Submit claims for fact-verification and display the resulting report";
  readonly usage = "verify <claim> [<claim2> ...] [--json]";
  readonly examples = [
    'verify "The Eiffel Tower is 300m tall"',
    'verify "Claim one" "Claim two" --json',
  ];

  async run(ctx: CommandContext): Promise<void> {
    if (ctx.args.length === 0) {
      printError("At least one claim argument is required. Usage: " + this.usage);
      process.exit(1);
    }

    const config = loadCliConfig();
    if (!config.apiKey) {
      printError("VERITAS_API_KEY environment variable is required");
      process.exit(1);
    }

    const client = new VeritasClient({ apiKey: config.apiKey, baseUrl: config.apiUrl });
    const claims = ctx.args.slice() as string[];

    let response: Awaited<ReturnType<typeof client.verification.submit>>;
    try {
      response = await client.verification.submit({ claims });
    } catch (err: unknown) {
      printError(err instanceof Error ? err.message : "Verification request failed");
      process.exit(1);
    }

    if (!response.success || !response.data) {
      const failure = response as { error?: { message?: string } };
      printError(failure.error?.message ?? "Verification failed with unknown error");
      process.exit(1);
    }

    const report = response.data;

    if (ctx.outputJson) {
      printJson(report as unknown as JsonValue);
      return;
    }

    printSuccess(`Trust score: ${report.trustScore}/100`);
    printLine(`Summary: ${report.summary}`);
    printLine(`Claims : ${report.counts.supported} supported, ${report.counts.refuted} refuted, ${report.counts.unverifiable} unverifiable`);

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
  }
}
