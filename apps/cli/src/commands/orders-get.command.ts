// OrdersGet command: fetches a single CAP order by ID
import { VeritasClient } from "@veritas/sdk/client.js";
import type { Command, CommandContext } from "../command.js";
import { loadCliConfig } from "../config.js";
import { printJson, printTable } from "../output.js";
import { createSpinner } from "../spinner.js";

export const ordersGetCommand: Command = {
  name: "orders:get",
  aliases: ["orders-get"],
  description: "Fetch details of a single CAP verification order by ID.",
  usage: "orders:get <orderId> [--json]",
  examples: [
    "veritas orders:get ord_01HZ...",
    "veritas orders:get ord_01HZ... --json",
  ],

  async run(ctx: CommandContext): Promise<void> {
    const orderId = ctx.args[0];
    if (typeof orderId !== "string" || orderId.length === 0) {
      throw new Error("Usage: veritas orders:get <orderId>");
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

    const spinner = createSpinner(`Fetching order ${orderId}…`);
    spinner.start();

    let response;
    try {
      response = await client.orders.get(orderId);
      spinner.succeed("Fetched order");
    } catch (err: unknown) {
      spinner.fail("Failed to fetch order");
      throw err;
    }

    if (ctx.outputJson) {
      printJson(response as unknown as import("@veritas/core").JsonValue);
      return;
    }

    const o = response.data;
    if (o === null || o === undefined) {
      throw new Error(`Order not found: ${orderId}`);
    }

    printTable([
      {
        id: o.id,
        status: o.status,
        serviceId: o.serviceId,
        agentId: o.buyerAgentId ?? "",
        amount: o.price !== undefined ? String(o.price) : "",
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
      },
    ]);
  },
};
