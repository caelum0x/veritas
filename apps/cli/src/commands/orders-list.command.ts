// OrdersList command: lists CAP verification orders with optional filters
import { VeritasClient } from "@veritas/sdk/client.js";
import type { OrdersResource } from "@veritas/sdk/resources/orders.js";
import type { Command, CommandContext } from "../command.js";
import { loadCliConfig } from "../config.js";
import { printJson, printTable } from "../output.js";
import { createSpinner } from "../spinner.js";

type OrderPage = Awaited<ReturnType<OrdersResource["list"]>>;

export const ordersListCommand: Command = {
  name: "orders:list",
  aliases: ["orders-list"],
  description: "List CAP verification orders with optional filtering.",
  usage: "orders:list [--service <serviceId>] [--agent <agentId>] [--status <status>] [--limit <n>] [--cursor <cursor>] [--json]",
  examples: [
    "veritas orders:list",
    "veritas orders:list --status pending",
    "veritas orders:list --agent ag_01HZ... --json",
  ],

  async run(ctx: CommandContext): Promise<void> {
    const config = loadCliConfig();
    const apiKey = ctx.flags["api-key"] ?? config.apiKey;
    if (typeof apiKey !== "string" || apiKey.length === 0) {
      throw new Error("API key is required. Set VERITAS_API_KEY or pass --api-key.");
    }

    const serviceId = typeof ctx.flags["service"] === "string" ? ctx.flags["service"] : undefined;
    const agentId = typeof ctx.flags["agent"] === "string" ? ctx.flags["agent"] : undefined;
    const status = typeof ctx.flags["status"] === "string" ? ctx.flags["status"] : undefined;
    const limit = ctx.flags["limit"] !== undefined ? Number(ctx.flags["limit"]) : undefined;
    const cursor = typeof ctx.flags["cursor"] === "string" ? ctx.flags["cursor"] : undefined;

    const client = new VeritasClient({
      apiKey,
      baseUrl: config.apiUrl,
      timeoutMs: config.timeout,
    });

    const spinner = createSpinner("Fetching orders…");
    spinner.start();

    let page: OrderPage;
    try {
      page = await client.orders.list({ serviceId, agentId, status, limit, cursor });
      spinner.succeed("Fetched orders");
    } catch (err: unknown) {
      spinner.fail("Failed to fetch orders");
      throw err;
    }

    const items = Array.isArray(page.data) ? page.data : [];

    if (ctx.outputJson) {
      printJson(page as unknown as import("@veritas/core").JsonValue);
      return;
    }

    printTable(
      items.map((o) => ({
        id: o.id,
        status: o.status,
        serviceId: o.serviceId,
        agentId: o.agentId ?? "",
        amount: o.amount !== undefined ? String(o.amount) : "",
        createdAt: o.createdAt,
      })),
    );
  },
};
