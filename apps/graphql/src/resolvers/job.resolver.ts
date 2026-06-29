// Job GraphQL resolvers: submit, cancel, and query asynchronous verification jobs.
import type { GqlContext } from "../context.js";
import type { Job } from "@veritas/contracts";
import { notFound, toGraphQLError } from "../errors.js";
import {
  pageToConnection,
  connectionArgsToPageRequest,
  type Connection,
  type ConnectionArgs,
} from "../pagination.js";
import { isOk } from "@veritas/core";

interface SubmitJobInput {
  readonly text?: string | null;
  readonly claims?: readonly string[] | null;
  readonly context?: string | null;
  readonly allowedDomains?: readonly string[] | null;
  readonly idempotencyKey?: string | null;
}

interface JobArgs {
  readonly id: string;
}

interface JobsArgs extends ConnectionArgs {
  readonly status?: string | null;
}

interface SubmitJobArgs {
  readonly input: SubmitJobInput;
}

interface CancelJobArgs {
  readonly id: string;
}

/** Root Query and Mutation resolvers for the Job type. */
export const jobResolvers = {
  Query: {
    job: async (
      _parent: unknown,
      args: JobArgs,
      ctx: GqlContext,
    ): Promise<Job> => {
      const record = await ctx.loaders.job.load(args.id);
      if (record === null) {
        throw notFound("Job", args.id);
      }
      return record;
    },

    jobs: async (
      _parent: unknown,
      args: JobsArgs,
      ctx: GqlContext,
    ): Promise<Connection<Job>> => {
      if (ctx.serviceCtx === undefined) {
        throw toGraphQLError(new Error("No service context available"));
      }
      const pageRequest = connectionArgsToPageRequest(args);
      const result = await ctx.services.verificationJob.list(ctx.serviceCtx, {
        status: args.status as Job["status"] | undefined,
        limit: pageRequest.limit,
        cursor: pageRequest.cursor,
      });
      if (!isOk(result)) {
        throw toGraphQLError(result.error);
      }
      return pageToConnection(result.value, (j) => j.id);
    },
  },

  Mutation: {
    submitJob: async (
      _parent: unknown,
      args: SubmitJobArgs,
      ctx: GqlContext,
    ): Promise<Job> => {
      if (ctx.serviceCtx === undefined) {
        throw toGraphQLError(new Error("No service context available"));
      }
      const result = await ctx.services.verificationJob.submit(
        ctx.serviceCtx,
        {
          text: args.input.text ?? undefined,
          claims: args.input.claims ? [...args.input.claims] : undefined,
          context: args.input.context ?? undefined,
          allowedDomains: args.input.allowedDomains
            ? [...args.input.allowedDomains]
            : undefined,
          idempotencyKey: args.input.idempotencyKey ?? undefined,
        },
      );
      if (!isOk(result)) {
        throw toGraphQLError(result.error);
      }
      const job = await ctx.loaders.job.load(result.value.id);
      if (job === null) {
        throw notFound("Job", result.value.id);
      }
      return job;
    },

    cancelJob: async (
      _parent: unknown,
      args: CancelJobArgs,
      ctx: GqlContext,
    ): Promise<Job> => {
      if (ctx.serviceCtx === undefined) {
        throw toGraphQLError(new Error("No service context available"));
      }
      const result = await ctx.services.verificationJob.cancel(
        ctx.serviceCtx,
        { jobId: args.id },
      );
      if (!isOk(result)) {
        throw toGraphQLError(result.error);
      }
      ctx.loaders.job.clear(args.id);
      const job = await ctx.loaders.job.load(args.id);
      if (job === null) {
        throw notFound("Job", args.id);
      }
      return job;
    },
  },
};
