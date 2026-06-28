// Invoice GraphQL resolvers — CRUD + list operations via @veritas/services
import type { Invoice } from "@veritas/contracts";
import type { GqlContext } from "../context.js";
import { toGqlError } from "../errors.js";

export const invoiceResolvers = {
  Query: {
    invoice: async (
      _: unknown,
      { id }: { id: string },
      ctx: GqlContext
    ): Promise<Invoice | null> => {
      const result = await ctx.services.billing.getInvoice(id);
      if (result.ok) return result.value ?? null;
      throw toGqlError(result.error);
    },

    invoices: async (
      _: unknown,
      args: { organizationId?: string; first?: number; after?: string },
      ctx: GqlContext
    ) => {
      const result = await ctx.services.billing.listInvoices({
        organizationId: args.organizationId,
        limit: args.first ?? 20,
        cursor: args.after,
      });
      if (!result.ok) throw toGqlError(result.error);
      const { items, nextCursor } = result.value;
      return { items, nextCursor: nextCursor ?? null, hasMore: nextCursor !== null };
    },
  },

  Mutation: {
    createInvoice: async (
      _: unknown,
      { input }: { input: Record<string, unknown> },
      ctx: GqlContext
    ): Promise<Invoice> => {
      const result = await ctx.services.billing.createInvoice(input as never);
      if (result.ok) return result.value;
      throw toGqlError(result.error);
    },

    updateInvoice: async (
      _: unknown,
      { id, input }: { id: string; input: Record<string, unknown> },
      ctx: GqlContext
    ): Promise<Invoice> => {
      const result = await ctx.services.billing.updateInvoice(id, input as never);
      if (result.ok) return result.value;
      throw toGqlError(result.error);
    },

    voidInvoice: async (
      _: unknown,
      { id }: { id: string },
      ctx: GqlContext
    ): Promise<Invoice> => {
      const result = await ctx.services.billing.voidInvoice(id);
      if (result.ok) return result.value;
      throw toGqlError(result.error);
    },
  },

  Invoice: {
    lineItems: (parent: Invoice) => parent.lineItems ?? [],
  },
};
