// Agent GraphQL resolvers: query and mutate CAP Agents within the fact-verification platform.
import type { GqlContext } from "../context.js";
import type { Agent } from "@veritas/contracts";
import { notFound, toGraphQLError } from "../errors.js";
import {
  pageToConnection,
  connectionArgsToPageRequest,
  type Connection,
  type ConnectionArgs,
} from "../pagination.js";
import { isOk } from "@veritas/core";

interface AgentArgs {
  readonly id: string;
}

interface AgentsArgs extends ConnectionArgs {
  readonly isActive?: boolean | null;
}

interface CreateAgentArgs {
  readonly input: {
    readonly name: string;
    readonly description?: string | null;
    readonly endpoint: string;
    readonly capabilities?: readonly string[] | null;
    readonly metadata?: Record<string, unknown> | null;
  };
}

interface UpdateAgentArgs {
  readonly id: string;
  readonly input: {
    readonly name?: string | null;
    readonly description?: string | null;
    readonly endpoint?: string | null;
    readonly capabilities?: readonly string[] | null;
    readonly isActive?: boolean | null;
    readonly metadata?: Record<string, unknown> | null;
  };
}

interface DeleteAgentArgs {
  readonly id: string;
}

/** Root Query and Mutation resolvers for the Agent type. */
export const agentResolvers = {
  Query: {
    agent: async (
      _parent: unknown,
      args: AgentArgs,
      ctx: GqlContext,
    ): Promise<Agent> => {
      const record = await ctx.loaders.agent.load(args.id);
      if (record === null) {
        throw notFound("Agent", args.id);
      }
      return record;
    },

    agents: async (
      _parent: unknown,
      args: AgentsArgs,
      ctx: GqlContext,
    ): Promise<Connection<Agent>> => {
      if (ctx.serviceCtx === undefined) {
        throw toGraphQLError(new Error("No service context available"));
      }
      const pageRequest = connectionArgsToPageRequest(args);
      void pageRequest;
      // Return empty connection until agent listing service is wired.
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
    createAgent: async (
      _parent: unknown,
      args: CreateAgentArgs,
      ctx: GqlContext,
    ): Promise<Agent> => {
      if (ctx.principal === undefined || ctx.serviceCtx === undefined) {
        throw toGraphQLError(new Error("Unauthorized"));
      }
      throw toGraphQLError(
        new Error(
          `createAgent not yet delegated: received name="${args.input.name}"`,
        ),
      );
    },

    updateAgent: async (
      _parent: unknown,
      args: UpdateAgentArgs,
      ctx: GqlContext,
    ): Promise<Agent> => {
      if (ctx.principal === undefined || ctx.serviceCtx === undefined) {
        throw toGraphQLError(new Error("Unauthorized"));
      }
      const existing = await ctx.loaders.agent.load(args.id);
      if (existing === null) {
        throw notFound("Agent", args.id);
      }
      throw toGraphQLError(
        new Error(`updateAgent not yet delegated for id="${args.id}"`),
      );
    },

    deleteAgent: async (
      _parent: unknown,
      args: DeleteAgentArgs,
      ctx: GqlContext,
    ): Promise<boolean> => {
      if (ctx.principal === undefined || ctx.serviceCtx === undefined) {
        throw toGraphQLError(new Error("Unauthorized"));
      }
      const existing = await ctx.loaders.agent.load(args.id);
      if (existing === null) {
        throw notFound("Agent", args.id);
      }
      throw toGraphQLError(
        new Error(`deleteAgent not yet delegated for id="${args.id}"`),
      );
    },
  },
};
