// Usage feature service: delegates to UsageMeteringService from @veritas/services via deps.
import { epochToIso, newId, type Result, type Page } from "@veritas/core";
import type { Usage } from "@veritas/contracts";
import type { UsageMeteringService, UsageSummaryOutput } from "@veritas/services";
import { makeServiceContext, type Principal } from "@veritas/services";
import type { Logger } from "@veritas/core";
import type { AuthenticatedRequest } from "../../middleware/auth.js";
import type {
  ListUsageQuery,
  CreateUsageBody,
  UsageSummaryQuery,
} from "./usage.schema.js";

export interface UsageDeps {
  readonly usageMeteringService: UsageMeteringService;
  readonly logger: Logger;
}

function buildCtx(req: AuthenticatedRequest) {
  const principal: Principal = {
    userId: req.userId ?? "anonymous",
    orgId: req.orgId ?? undefined,
    roles: req.scopes ?? [],
    apiKeyId: req.apiKeyId ?? undefined,
  };
  const requestId = (req as unknown as { requestId?: string }).requestId ?? newId("req");
  return makeServiceContext(principal, requestId, requestId, epochToIso(Date.now()));
}

export class UsageFeatureService {
  private readonly svc: UsageMeteringService;
  private readonly logger: Logger;

  constructor(deps: UsageDeps) {
    this.svc = deps.usageMeteringService;
    this.logger = deps.logger;
  }

  async list(req: AuthenticatedRequest, query: ListUsageQuery): Promise<Result<Page<Usage>>> {
    const ctx = buildCtx(req);
    return this.svc.list(ctx, {
      organizationId: query.organizationId,
      subscriptionId: query.subscriptionId,
      metric: query.metric,
      from: query.from,
      to: query.to,
      cursor: query.cursor,
      limit: query.limit,
    });
  }

  async getById(req: AuthenticatedRequest, id: string): Promise<Result<Usage>> {
    const ctx = buildCtx(req);
    return this.svc.getById(ctx, id);
  }

  async record(req: AuthenticatedRequest, body: CreateUsageBody): Promise<Result<Usage>> {
    const ctx = buildCtx(req);
    return this.svc.record(ctx, body);
  }

  async summarize(
    req: AuthenticatedRequest,
    query: UsageSummaryQuery,
  ): Promise<Result<UsageSummaryOutput>> {
    const ctx = buildCtx(req);
    return this.svc.summarize(ctx, {
      organizationId: query.organizationId,
      metric: query.metric,
      from: query.from,
      to: query.to,
    });
  }
}
