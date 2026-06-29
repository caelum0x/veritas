// Plan GraphQL resolvers — CRUD + list operations via @veritas/services
import type { Plan } from "@veritas/contracts";
import type { GqlContext } from "../context.js";
import { toGqlError } from "../errors.js";

export const planResolvers = {
  Query: {
    plan: async (
      _: unknown,
      { id }: { id: string },
      ctx: GqlContext
    ): Promise<Plan | null> => {
      const result = await ctx.services.billing.getPlan(id);
      if (result.ok) return result.value ?? null;
      throw toGqlError(result.error);
    },

    plans: async (
      _: unknown,
      args: { first?: number; after?: string; activeOnly?: boolean },
      ctx: GqlContext
    ) => {
      const result = await ctx.services.billing.listPlans({
        activeOnly: args.activeOnly ?? false,
        limit: args.first ?? 20,
        cursor: args.after,
      });
      if (!result.ok) throw toGqlError(result.error);
      const { items, nextCursor } = result.value;
      return { items, nextCursor: nextCursor ?? null, hasMore: nextCursor !== null };
    },
  },

  Mutation: {
    createPlan: async (
      _: unknown,
      { input }: { input: Record<string, unknown> },
      ctx: GqlContext
    ): Promise<Plan> => {
      const result = await ctx.services.billing.createPlan(input as never);
      if (result.ok) return result.value;
      throw toGqlError(result.error);
    },

    updatePlan: async (
      _: unknown,
      { id, input }: { id: string; input: Record<string, unknown> },
      ctx: GqlContext
    ): Promise<Plan> => {
      const result = await ctx.services.billing.updatePlan(id, input as never);
      if (result.ok) return result.value;
      throw toGqlError(result.error);
    },

    archivePlan: async (
      _: unknown,
      { id }: { id: string },
      ctx: GqlContext
    ): Promise<Plan> => {
      const result = await ctx.services.billing.archivePlan(id);
      if (result.ok) return result.value;
      throw toGqlError(result.error);
    },
  },

  Plan: {
    features: (parent: Plan) => (parent as Plan & { features?: unknown[] }).features ?? [],
  },
};
