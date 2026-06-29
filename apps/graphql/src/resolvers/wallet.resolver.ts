// GraphQL resolvers for Wallet queries and mutations
import { isOk, unwrap } from "@veritas/core";
import type { Wallet } from "@veritas/contracts";
import { toGqlError } from "../errors.js";
import type { GqlContext } from "../context.js";

export const walletResolvers = {
  Query: {
    wallet: async (
      _: unknown,
      { id }: { id: string },
      ctx: GqlContext
    ): Promise<Wallet | null> => {
      const result = await ctx.services.wallet.findById(id);
      return result ?? null;
    },

    walletByOrganization: async (
      _: unknown,
      { organizationId }: { organizationId: string },
      ctx: GqlContext
    ): Promise<Wallet | null> => {
      const result = await ctx.services.wallet.findByOrganization(organizationId);
      if (!isOk(result)) throw toGqlError(result.error);
      return unwrap(result) ?? null;
    },
  },

  Mutation: {
    createWallet: async (
      _: unknown,
      { organizationId }: { organizationId: string },
      ctx: GqlContext
    ): Promise<Wallet> => {
      const result = await ctx.services.wallet.create({ organizationId });
      if (!isOk(result)) throw toGqlError(result.error);
      return unwrap(result);
    },
  },
};
