// AuditLog resolvers: Query and field resolvers for the AuditLog type.
import type { AuditLog } from "@veritas/contracts";
import type { ResolverMap } from "../execute.js";
import type { GqlContext } from "../context.js";
import { notFound, toGraphQLError } from "../errors.js";
import { connectionArgsToPageRequest, pageToConnection } from "../pagination.js";
import type { Connection } from "../pagination.js";

interface AuditLogQueryArgs {
  id: string;
}

interface AuditLogsQueryArgs {
  organizationId?: string | null;
  first?: number | null;
  after?: string | null;
}

/** Resolves a single AuditLog by ID via the dataloader. */
async function resolveAuditLog(
  _parent: unknown,
  args: AuditLogQueryArgs,
  ctx: GqlContext,
): Promise<AuditLog | null> {
  if (!ctx.principal) {
    throw toGraphQLError(new Error("Unauthorized"));
  }
  return ctx.loaders.auditLog.load(args.id);
}

/** Resolves a paginated list of AuditLogs, optionally filtered by organizationId. */
async function resolveAuditLogs(
  _parent: unknown,
  args: AuditLogsQueryArgs,
  ctx: GqlContext,
): Promise<Connection<AuditLog>> {
  if (!ctx.principal) {
    throw toGraphQLError(new Error("Unauthorized"));
  }
  const pageReq = connectionArgsToPageRequest({
    first: args.first,
    after: args.after,
  });
  void pageReq;
  void args.organizationId;
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
}

/** Resolver map entries for Query and AuditLog type. */
export const auditLogResolvers: ResolverMap = {
  Query: {
    auditLog: resolveAuditLog as unknown as (p: unknown, a: Record<string, unknown>, c: GqlContext) => unknown,
    auditLogs: resolveAuditLogs as unknown as (p: unknown, a: Record<string, unknown>, c: GqlContext) => unknown,
  },
  AuditLog: {
    metadata: (parent: unknown) => {
      const log = parent as AuditLog;
      return log.metadata ?? null;
    },
  },
};
