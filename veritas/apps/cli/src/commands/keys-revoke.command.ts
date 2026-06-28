// KeysRevoke command: revokes (deletes) an API key by ID
import { VeritasClient } from "@veritas/sdk/client.js";
import type { Command, CommandContext } from "../command.js";
import { loadCliConfig } from "../config.js";
import { printJson, printSuccess, printLine } from "../output.js";
import { createSpinner } from "../spinner.js";

export const keysRevokeCommand: Command = {
  name: "keys:revoke",
  aliases: ["keys-revoke"],
  description: "Revoke an API key by ID, immediately invalidating it.",
  usage: "keys:revoke <keyId> [--json]",
  examples: [
    "veritas keys:revoke ak_01HZ...",
    "veritas keys:revoke ak_01HZ... --json",
  ],

  async run(ctx: CommandContext): Promise<void> {
    const keyId = ctx.args[0];
    if (typeof keyId !== "string" || keyId.length === 0) {
      throw new Error("Usage: veritas keys:revoke <keyId>");
    }

    const config = loadCliConfig();
    const apiKey = ctx.flags["api-key"] ?? config.apiKey;
    if (typeof apiKey !== "string" || apiKey.length === 0) {
      throw new Error("API key is required. Set VERITAS_API_KEY or pass --api-key.");
    }

    const client = new VeritasClient({
      apiKey,
      baseUrl: config.apiUrl,
      timeoutMs: config.timeout,
    });

    const spinner = createSpinner(`Revoking API key ${keyId}…`);
    spinner.start();

    let result;
    try {
      result = await client.apiKeys.revoke(keyId);
      spinner.succeed(`API key ${keyId} revoked`);
    } catch (err: unknown) {
      spinner.fail("Failed to revoke API key");
      throw err;
    }

    if (ctx.outputJson) {
      printJson(result as unknown as import("@veritas/core").JsonValue);
      return;
    }

    printSuccess(`API key revoked: ${keyId}`);
    printLine("The key is immediately invalidated and cannot be restored.");
  },
};
