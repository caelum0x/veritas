// Job handler that summarizes unbilled usage per organization for the previous billing period.
import { epochToIso, type Logger } from "@veritas/core";
import { UsageMeteringService, systemContext } from "@veritas/services";
import type { JobExecutionContext } from "@veritas/scheduler";
import { asId } from "@veritas/core";

const SYSTEM_USER_ID = asId("system-scheduler", "user");

export interface RollupUsageJobDeps {
  readonly usageMeteringService: UsageMeteringService;
  readonly logger: Logger;
}

/** Payload optionally injected via job config to scope rollup to an org. */
interface RollupUsagePayload {
  readonly organizationId?: string;
  readonly fromOverride?: string;
  readonly toOverride?: string;
}

function isRollupUsagePayload(v: unknown): v is RollupUsagePayload {
  return typeof v === "object" && v !== null;
}

export function makeRollupUsageHandler(deps: RollupUsageJobDeps) {
  const { usageMeteringService, logger } = deps;

  return async function rollupUsageHandler(ctx: JobExecutionContext): Promise<void> {
    const requestId = `rollup-usage-${ctx.scheduledAt.toISOString()}`;
    const svcCtx = systemContext(SYSTEM_USER_ID, requestId, epochToIso(ctx.scheduledAt.getTime()));
    const log = logger.child({ jobId: ctx.jobId, requestId });

    const payload = isRollupUsagePayload(ctx.payload) ? ctx.payload : {};
    const now = ctx.scheduledAt;
    const periodStart = payload.fromOverride ?? new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const periodEnd = payload.toOverride ?? new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const metrics: ReadonlyArray<string> = ["VERIFICATIONS", "CLAIMS", "SOURCES", "TOKENS"];

    if (payload.organizationId !== undefined) {
      await rollupForOrg(payload.organizationId, periodStart, periodEnd);
    } else {
      log.info("rollup-usage: no organizationId scoped; running in no-op aggregate mode", {
        periodStart,
        periodEnd,
      });
    }

    async function rollupForOrg(orgId: string, from: string, to: string): Promise<void> {
      for (const metric of metrics) {
        const result = await usageMeteringService.summarize(svcCtx, {
          organizationId: orgId,
          metric: metric as "VERIFICATIONS",
          from,
          to,
        });
        if (result.ok) {
          log.info("rollup-usage: summarized metric", {
            orgId,
            metric,
            totalQuantity: result.value.totalQuantity,
            from,
            to,
          });
        } else {
          log.warn("rollup-usage: failed to summarize metric", {
            orgId,
            metric,
            error: String(result.error),
          });
        }
      }
    }

    log.info("rollup-usage: completed", { periodStart, periodEnd });
  };
}
