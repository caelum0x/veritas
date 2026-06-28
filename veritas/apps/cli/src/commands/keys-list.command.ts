// KeysList command: lists API keys for the authenticated organization
import { VeritasClient } from "@veritas/sdk/client.js";
import type { ApiKeysResource } from "@veritas/sdk/resources/apiKeys.js";
import type { Command, CommandContext } from "../command.js";
import { loadCliConfig } from "../config.js";
import { printJson, printTable } from "../output.js";
import { createSpinner } from "../spinner.js";

type ApiKeyPage = Awaited<ReturnType<ApiKeysResource["list"]>>;

export const keysListCommand: Command = {
  name: "keys:list",
  aliases: ["keys-list"],
  description: "List all API keys for the authenticated organization.",
  usage: "keys:list [--limit <n>] [--cursor <cursor>] [--json]",
  examples: [
    "veritas keys:list",
    "veritas keys:list --limit 10",
    "veritas keys:list --json",
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

    const spinner = createSpinner("Fetching API keys…");
    spinner.start();

    let page: ApiKeyPage;
    try {
      page = await client.apiKeys.list({ limit, cursor });
      spinner.succeed("Fetched API keys");
    } catch (err: unknown) {
      spinner.fail("Failed to fetch API keys");
      throw err;
    }

    const items = Array.isArray(page.data) ? page.data : [];

    if (ctx.outputJson) {
      printJson(page as unknown as import("@veritas/core").JsonValue);
      return;
    }

    printTable(
      items.map((k) => ({
        id: k.id,
        name: k.name ?? "",
        prefix: k.prefix,
        status: k.status,
        createdAt: k.createdAt,
      })),
    );
  },
};
