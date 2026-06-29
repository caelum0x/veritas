// Invoice DataLoader — batch-loads invoices by ID to avoid N+1 queries
import type { Invoice } from "@veritas/contracts";
import type { GqlContext } from "../context.js";
import { createLoader } from "../dataloader.js";

export function createInvoiceLoader(ctx: GqlContext) {
  return createLoader<string, Invoice>(async (ids) => {
    const result = await ctx.services.billing.getInvoicesByIds([...ids]);
    if (!result.ok) return ids.map((id) => new Error(`Invoice not found: ${id}`));
    const byId = new Map(result.value.map((inv: Invoice) => [inv.id, inv]));
    return ids.map((id) => byId.get(id) ?? new Error(`Invoice not found: ${id}`));
  });
}

export type InvoiceLoader = ReturnType<typeof createInvoiceLoader>;
