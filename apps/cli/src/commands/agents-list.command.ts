// AgentsList command: lists registered CAP agents
import { VeritasClient } from "@veritas/sdk/client.js";
import type { AgentsResource } from "@veritas/sdk/resources/agents.js";
import type { Command, CommandContext } from "../command.js";
import { loadCliConfig } from "../config.js";
import { printJson, printTable } from "../output.js";
import { createSpinner } from "../spinner.js";

type AgentPage = Awaited<ReturnType<AgentsResource["list"]>>;

export const agentsListCommand: Command = {
  name: "agents:list",
  aliases: ["agents-list"],
  description: "List all registered CAP agents.",
  usage: "agents:list [--limit <n>] [--cursor <cursor>] [--json]",
  examples: [
    "veritas agents:list",
    "veritas agents:list --limit 20",
    "veritas agents:list --json",
  ],

  async run(ctx: CommandContext): Promise<void> {
    const config = loadCliConfig();
    const apiKey = ctx.flags["api-key"] ?? config.apiKey;
    if (typeof apiKey !== "string" || apiKey.length === 0) {
      throw new Error("API key is required. Set VERITAS_API_KEY or pass --api-key.");
    }

    const limit = ctx.flags["limit"] !== undefined ? Number(ctx.flags["limit"]) : undefined;
    const cursor = typeof ctx.flags["cursor"] === "string" ? ctx.flags["cursor"] : undefined;

    const client = new VeritasClient({
      apiKey,
      baseUrl: config.apiUrl,
      timeoutMs: config.timeout,
    });

    const spinner = createSpinner("Fetching agents…");
    spinner.start();

    let page: AgentPage;
    try {
      page = await client.agents.list({ limit, cursor });
      spinner.succeed("Fetched agents");
    } catch (err: unknown) {
      spinner.fail("Failed to fetch agents");
      throw err;
    }

    const items = Array.isArray(page.data) ? page.data : [];

    if (ctx.outputJson) {
      printJson(page as unknown as import("@veritas/core").JsonValue);
      return;
    }

    printTable(
      items.map((a) => ({
        id: a.id,
        name: a.name,
        endpoint: a.endpoint,
        tier: a.tier,
        status: a.status,
        createdAt: a.createdAt,
      })),
    );
  },
};
