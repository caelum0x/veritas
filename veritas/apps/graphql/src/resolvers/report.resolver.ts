// Report resolvers: Query and Mutation handlers for the Report GraphQL type.
import { isErr } from "@veritas/core";
import type { ReportService } from "@veritas/services";
import type { GqlContext } from "../context.js";
import type { Resolver } from "../execute.js";
import { notFound, toGraphQLError } from "../errors.js";
import { pageToConnection, connectionArgsToPageRequest } from "../pagination.js";
import type { Report } from "@veritas/contracts";

interface ReportQueryArgs {
  id: string;
}

interface ReportByVerificationArgs {
  verificationId: string;
}

interface ReportsArgs {
  verificationId?: string;
  first?: number;
  after?: string;
}

interface DeleteReportArgs {
  id: string;
}

function requireReportService(ctx: GqlContext): ReportService {
  if (ctx.serviceCtx === undefined) {
    throw toGraphQLError(new Error("No service context available"));
  }
  const svc = (ctx.serviceCtx as unknown as Record<string, unknown>)["reportService"];
  if (svc === undefined) {
    throw toGraphQLError(new Error("ReportService not available in context"));
  }
  return svc as ReportService;
}

const reportQuery: Resolver<ReportQueryArgs> = async (_parent, args, ctx) => {
  const svc = requireReportService(ctx);
  const serviceCtx = ctx.serviceCtx!;
  const result = await svc.getById(serviceCtx, { reportId: args.id });
  if (isErr(result)) {
    throw notFound("Report", args.id);
  }
  return result.value;
};

const reportByVerificationQuery: Resolver<ReportByVerificationArgs> = async (
  _parent,
  args,
  ctx,
) => {
  const svc = requireReportService(ctx);
  const serviceCtx = ctx.serviceCtx!;
  const result = await svc.getByVerificationId(serviceCtx, {
    verificationId: args.verificationId,
  });
  if (isErr(result)) {
    throw notFound("Report", args.verificationId);
  }
  return result.value;
};

const reportsQuery: Resolver<ReportsArgs> = async (_parent, args, ctx) => {
  const svc = requireReportService(ctx);
  const serviceCtx = ctx.serviceCtx!;
  const pageReq = connectionArgsToPageRequest({ first: args.first, after: args.after });
  const result = await svc.list(serviceCtx, {
    verificationId: args.verificationId,
    cursor: pageReq.cursor,
    limit: pageReq.limit,
  });
  if (isErr(result)) {
    throw toGraphQLError(result.error);
  }
  return pageToConnection(result.value, (r) => (r as unknown as Report).id);
};

const deleteReportMutation: Resolver<DeleteReportArgs> = async (_parent, args, ctx) => {
  const svc = requireReportService(ctx);
  const serviceCtx = ctx.serviceCtx!;
  const result = await svc.delete(serviceCtx, { reportId: args.id });
  if (isErr(result)) {
    throw notFound("Report", args.id);
  }
  return true;
};

export const reportResolvers = {
  Query: {
    report: reportQuery,
    reportByVerification: reportByVerificationQuery,
    reports: reportsQuery,
  },
  Mutation: {
    deleteReport: deleteReportMutation,
  },
} as const;
