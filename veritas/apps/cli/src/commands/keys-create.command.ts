// KeysCreate command — create a new API key and display the secret (shown only once)
import type { Command, CommandContext } from "../command.js";
import { printJson, printLine, printError, printSuccess, printWarning } from "../output.js";
import { loadCliConfig } from "../config.js";
import { VeritasClient } from "@veritas/sdk/client.js";
import type { JsonValue } from "@veritas/core";

export class KeysCreateCommand implements Command {
  readonly name = "keys-create";
  readonly aliases = ["kc"];
  readonly description = "Create a new API key (the secret is shown only once)";
  readonly usage = "keys-create --org <org-id> --name <name> [--scopes <s1,s2>] [--expires <iso-date>] [--json]";
  readonly examples = [
    "keys-create --org org_abc123 --name ci-pipeline",
    "keys-create --org org_abc123 --name read-only --scopes verify:read,reports:read",
    "keys-create --org org_abc123 --name temp --expires 2026-12-31T00:00:00Z --json",
  ];

  async run(ctx: CommandContext): Promise<void> {
    const orgId = ctx.flags["org"];
    const name = ctx.flags["name"];

    if (!orgId || typeof orgId !== "string") {
      printError("--org <org-id> is required. Usage: " + this.usage);
      process.exit(1);
    }
    if (!name || typeof name !== "string") {
      printError("--name <name> is required. Usage: " + this.usage);
      process.exit(1);
    }

    const config = loadCliConfig();
    if (!config.apiKey) {
      printError("VERITAS_API_KEY environment variable is required");
      process.exit(1);
    }

    const client = new VeritasClient({ apiKey: config.apiKey, baseUrl: config.apiUrl });

    const scopesFlag = ctx.flags["scopes"];
    const scopes = typeof scopesFlag === "string" ? scopesFlag.split(",").map((s) => s.trim()).filter(Boolean) : undefined;

    const expiresFlag = ctx.flags["expires"];
    const expiresAt = typeof expiresFlag === "string" ? expiresFlag : undefined;

    let response: Awaited<ReturnType<typeof client.apiKeys.create>>;
    try {
      response = await client.apiKeys.create({
        organizationId: orgId as `org_${string}`,
        name,
        scopes,
        expiresAt: expiresAt ?? null,
      });
    } catch (err: unknown) {
      printError(err instanceof Error ? err.message : "Failed to create API key");
      process.exit(1);
    }

    if (!response.success || !response.data) {
      const failure = response as { error?: { message?: string } };
      printError(failure.error?.message ?? "API key creation failed");
      process.exit(1);
    }

    const key = response.data;

    if (ctx.outputJson) {
      printJson(key as unknown as JsonValue);
      return;
    }

    printSuccess(`API key created: ${key.id}`);
    printWarning("The secret below is shown ONLY ONCE. Copy it now and store it securely.");
    printLine("");
    printLine(`ID        : ${key.id}`);
    printLine(`Name      : ${key.name}`);
    printLine(`Prefix    : ${key.prefix}`);
    printLine(`Scopes    : ${key.scopes.join(", ") || "(none)"}`);
    printLine(`Expires   : ${key.expiresAt ?? "never"}`);
    printLine(`Created   : ${key.createdAt}`);
    printLine("");
    printLine(`Secret    : ${key.secret}`);
  }
}
