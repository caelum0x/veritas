// ReportsList command — list persisted verification reports with optional filtering
import type { Command, CommandContext } from "../command.js";
import { printJson, printTable, printLine, printError } from "../output.js";
import { loadCliConfig } from "../config.js";
import { VeritasClient } from "@veritas/sdk/client.js";
import type { JsonValue } from "@veritas/core";

export class ReportsListCommand implements Command {
  readonly name = "reports-list";
  readonly aliases = ["reports", "rls"];
  readonly description = "List persisted verification reports";
  readonly usage = "reports-list [--claim-id <id>] [--limit <n>] [--cursor <token>] [--json]";
  readonly examples = [
    "reports-list",
    "reports-list --limit 20",
    "reports-list --claim-id clm_abc123",
    "reports-list --json",
  ];

  async run(ctx: CommandContext): Promise<void> {
    const config = loadCliConfig();
    if (!config.apiKey) {
      printError("VERITAS_API_KEY environment variable is required");
      process.exit(1);
    }

    const client = new VeritasClient({ apiKey: config.apiKey, baseUrl: config.apiUrl });

    const claimIdFlag = ctx.flags["claim-id"];
    const limitFlag = ctx.flags["limit"];
    const cursorFlag = ctx.flags["cursor"];

    const claimId = typeof claimIdFlag === "string" ? claimIdFlag : undefined;
    const limit = typeof limitFlag === "string" ? parseInt(limitFlag, 10) : undefined;
    const cursor = typeof cursorFlag === "string" ? cursorFlag : undefined;

    let page: Awaited<ReturnType<typeof client.reports.list>>;
    try {
      page = await client.reports.list({
        claimId,
        limit: limit !== undefined && !isNaN(limit) ? limit : undefined,
        cursor,
      });
    } catch (err: unknown) {
      printError(err instanceof Error ? err.message : "Failed to list reports");
      process.exit(1);
    }

    if (ctx.outputJson) {
      printJson(page as unknown as JsonValue);
      return;
    }

    const items = page.data ?? [];
    if (items.length === 0) {
      printLine("No reports found.");
      return;
    }

    printTable(
      items.map((r) => ({
        id: r.id,
        verificationId: r.verificationId,
        trustScore: r.trustScore,
        supported: r.counts.supported,
        refuted: r.counts.refuted,
        unverifiable: r.counts.unverifiable,
        createdAt: r.createdAt,
      })),
    );

    if (page.meta?.nextCursor) {
      printLine(`\nNext cursor: ${page.meta.nextCursor}`);
    }
  }
}
