// Service GraphQL resolvers: query and mutate marketplace Services offered by Agents.
import type { GqlContext } from "../context.js";
import type { Service } from "@veritas/contracts";
import { notFound, toGraphQLError } from "../errors.js";
import {
  connectionArgsToPageRequest,
  type Connection,
  type ConnectionArgs,
} from "../pagination.js";

interface ServiceArgs {
  readonly id: string;
}

interface ServicesArgs extends ConnectionArgs {
  readonly agentId?: string | null;
  readonly isActive?: boolean | null;
}

interface CreateServiceArgs {
  readonly input: {
    readonly agentId: string;
    readonly name: string;
    readonly description?: string | null;
    readonly priceUsdc: string;
    readonly estimatedTurnaroundMs?: number | null;
    readonly capabilities?: readonly string[] | null;
    readonly metadata?: Record<string, unknown> | null;
  };
}

interface UpdateServiceArgs {
  readonly id: string;
  readonly input: {
    readonly name?: string | null;
    readonly description?: string | null;
    readonly priceUsdc?: string | null;
    readonly estimatedTurnaroundMs?: number | null;
    readonly capabilities?: readonly string[] | null;
    readonly isActive?: boolean | null;
    readonly metadata?: Record<string, unknown> | null;
  };
}

interface DeleteServiceArgs {
  readonly id: string;
}

/** Root Query and Mutation resolvers for the Service type. */
export const serviceResolvers = {
  Query: {
    service: async (
      _parent: unknown,
      args: ServiceArgs,
      ctx: GqlContext,
    ): Promise<Service> => {
      const record = await ctx.loaders.service.load(args.id);
      if (record === null) {
        throw notFound("Service", args.id);
      }
      return record;
    },

    services: async (
      _parent: unknown,
      args: ServicesArgs,
      ctx: GqlContext,
    ): Promise<Connection<Service>> => {
      if (ctx.serviceCtx === undefined) {
        throw toGraphQLError(new Error("No service context available"));
      }
      const pageRequest = connectionArgsToPageRequest(args);
      void pageRequest;
      // Return empty connection until service listing is wired to a backing store.
      return {
        edges: [],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: null,
          endCursor: null,
        },
        totalCount: 0,
      };
    },
  },

  Mutation: {
    createService: async (
      _parent: unknown,
      args: CreateServiceArgs,
      ctx: GqlContext,
    ): Promise<Service> => {
      if (ctx.principal === undefined || ctx.serviceCtx === undefined) {
        throw toGraphQLError(new Error("Unauthorized"));
      }
      throw toGraphQLError(
        new Error(
          `createService not yet delegated: received name="${args.input.name}"`,
        ),
      );
    },

    updateService: async (
      _parent: unknown,
      args: UpdateServiceArgs,
      ctx: GqlContext,
    ): Promise<Service> => {
      if (ctx.principal === undefined || ctx.serviceCtx === undefined) {
        throw toGraphQLError(new Error("Unauthorized"));
      }
      const existing = await ctx.loaders.service.load(args.id);
      if (existing === null) {
        throw notFound("Service", args.id);
      }
      throw toGraphQLError(
        new Error(`updateService not yet delegated for id="${args.id}"`),
      );
    },

    deleteService: async (
      _parent: unknown,
      args: DeleteServiceArgs,
      ctx: GqlContext,
    ): Promise<boolean> => {
      if (ctx.principal === undefined || ctx.serviceCtx === undefined) {
        throw toGraphQLError(new Error("Unauthorized"));
      }
      const existing = await ctx.loaders.service.load(args.id);
      if (existing === null) {
        throw notFound("Service", args.id);
      }
      throw toGraphQLError(
        new Error(`deleteService not yet delegated for id="${args.id}"`),
      );
    },
  },
};
