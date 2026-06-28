// GraphQL resolvers for ApiKey queries and mutations
import { isOk, unwrap } from "@veritas/core";
import type { ApiKey, CreateApiKey } from "@veritas/contracts";
import { toGqlError } from "../errors.js";
import type { GqlContext } from "../context.js";

interface CreateApiKeyArgs {
  organizationId: string;
  input: {
    name: string;
    scopes: string[];
    expiresAt?: string;
  };
}

export const apiKeyResolvers = {
  Query: {
    apiKey: async (
      _: unknown,
      { id }: { id: string },
      ctx: GqlContext
    ): Promise<ApiKey | null> => {
      const result = await ctx.services.apiKey.findById(id);
      return result ?? null;
    },

    apiKeys: async (
      _: unknown,
      { organizationId }: { organizationId: string },
      ctx: GqlContext
    ): Promise<ApiKey[]> => {
      const result = await ctx.services.apiKey.findByOrganization(organizationId);
      if (!isOk(result)) throw toGqlError(result.error);
      return unwrap(result);
    },
  },

  Mutation: {
    createApiKey: async (
      _: unknown,
      { organizationId, input }: CreateApiKeyArgs,
      ctx: GqlContext
    ) => {
      const payload: CreateApiKey = {
        organizationId,
        name: input.name,
        scopes: input.scopes,
        ...(input.expiresAt != null ? { expiresAt: input.expiresAt } : {}),
      };
      const result = await ctx.services.apiKey.create(payload);
      if (!isOk(result)) throw toGqlError(result.error);
      return unwrap(result);
    },

    revokeApiKey: async (
      _: unknown,
      { id }: { id: string },
      ctx: GqlContext
    ): Promise<boolean> => {
      const result = await ctx.services.apiKey.revoke(id);
      if (!isOk(result)) throw toGqlError(result.error);
      return true;
    },
  },
};
