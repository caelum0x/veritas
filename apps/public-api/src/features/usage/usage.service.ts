// Usage feature service: delegates to @veritas/services UsageMeteringService and @veritas/usage-billing UsageMeter.
import { isErr, epochToIso, newId } from "@veritas/core";
import type { Result, AppError, Page, Id, IsoTimestamp } from "@veritas/core";
import type { Usage, UsageMetric } from "@veritas/contracts";
import { makeServiceContext } from "@veritas/services";
import type { UsageMeteringService } from "@veritas/services";
import { UsageMeter, computeOverages, createBillableMetric } from "@veritas/usage-billing";
import type { OverageResult } from "@veritas/usage-billing";
import type { RecordUsageBody, ListUsageQuery, UsageSummaryQuery } from "./usage.schema.js";

export interface UsageServiceDeps {
  readonly usageMeteringService: UsageMeteringService;
  readonly usageMeter: UsageMeter;
}

export interface UsageSummaryResult {
  readonly organizationId: string;
  readonly metric: string;
  readonly from: string;
  readonly to: string;
  readonly totalQuantity: number;
}

function asId<T extends string>(value: string): Id<T> {
  return value as unknown as Id<T>;
}

function buildContext(orgId: string) {
  const reqId = newId("req");
  return makeServiceContext(
    { userId: asId("system"), orgId: asId(orgId), roles: ["system"], apiKeyId: undefined },
    reqId,
    reqId,
    epochToIso(Date.now()),
  );
}

export class UsageService {
  private readonly meteringService: UsageMeteringService;
  private readonly meter: UsageMeter;

  constructor(deps: UsageServiceDeps) {
    this.meteringService = deps.usageMeteringService;
    this.meter = deps.usageMeter;
  }

  async recordUsage(callerOrgId: string, body: RecordUsageBody): Promise<Result<Usage, AppError>> {
    const ctx = buildContext(callerOrgId);
    await this.meter.record(asId(callerOrgId), body.metric, body.quantity);
    return this.meteringService.record(ctx, {
      organizationId: asId(body.organizationId),
      subscriptionId: body.subscriptionId != null ? asId(body.subscriptionId) : null,
      metric: body.metric,
      quantity: body.quantity,
      idempotencyKey: body.idempotencyKey,
      metadata: body.metadata as Record<string, unknown> | undefined,
    });
  }

  async getUsageById(callerOrgId: string, id: string): Promise<Result<Usage, AppError>> {
    const ctx = buildContext(callerOrgId);
    return this.meteringService.getById(ctx, id);
  }

  async listUsage(callerOrgId: string, query: ListUsageQuery): Promise<Result<Page<Usage>, AppError>> {
    const ctx = buildContext(callerOrgId);
    const orgId = query.organizationId ?? callerOrgId;
    return this.meteringService.list(ctx, {
      organizationId: orgId,
      subscriptionId: query.subscriptionId,
      metric: query.metric,
      from: query.from,
      to: query.to,
      cursor: query.cursor,
      limit: query.limit ?? 20,
    });
  }

  async summarizeUsage(callerOrgId: string, query: UsageSummaryQuery): Promise<Result<UsageSummaryResult, AppError>> {
    const ctx = buildContext(callerOrgId);
    return this.meteringService.summarize(ctx, {
      organizationId: callerOrgId,
      metric: query.metric,
      from: query.from,
      to: query.to,
    });
  }

  computeOverages(
    from: string,
    to: string,
    usageTotals: ReadonlyMap<UsageMetric, number>,
  ): OverageResult {
    const window = {
      start: from as IsoTimestamp,
      end: to as IsoTimestamp,
      interval: "monthly" as const,
    };
    const metrics = Array.from(usageTotals.keys()).map((m) =>
      createBillableMetric(m, m, m, 0, 1n),
    );
    return computeOverages(window, metrics, usageTotals);
  }

  flushMeterEvents() {
    return this.meter.flush();
  }
}
