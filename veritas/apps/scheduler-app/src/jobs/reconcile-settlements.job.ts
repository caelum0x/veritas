// Job handler that reconciles SUBMITTED on-chain settlements to detect confirmation or failure.
import { epochToIso, type Logger } from "@veritas/core";
import { SettlementService, systemContext } from "@veritas/services";
import type { JobExecutionContext } from "@veritas/scheduler";
import { asId } from "@veritas/core";

const SYSTEM_USER_ID = asId("system-scheduler", "user");
const SETTLEMENT_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour

export interface ReconcileSettlementsJobDeps {
  readonly settlementService: SettlementService;
  readonly logger: Logger;
}

export function makeReconcileSettlementsHandler(deps: ReconcileSettlementsJobDeps) {
  const { settlementService, logger } = deps;

  return async function reconcileSettlementsHandler(ctx: JobExecutionContext): Promise<void> {
    const requestId = `reconcile-settlements-${ctx.scheduledAt.toISOString()}`;
    const svcCtx = systemContext(SYSTEM_USER_ID, requestId, epochToIso(ctx.scheduledAt.getTime()));
    const log = logger.child({ jobId: ctx.jobId, requestId });

    const listResult = await settlementService.list(svcCtx, { status: "SUBMITTED", limit: 100 });
    if (!listResult.ok) {
      log.error("reconcile-settlements: failed to list SUBMITTED settlements", {
        error: String(listResult.error),
      });
      throw listResult.error;
    }

    const now = ctx.scheduledAt.getTime();
    const settlements = listResult.value.items;
    log.info("reconcile-settlements: processing settlements", { count: settlements.length });

    let timedOut = 0;
    let skipped = 0;

    for (const settlement of settlements) {
      const submittedAt = new Date(settlement.createdAt).getTime();
      const age = now - submittedAt;

      if (age > SETTLEMENT_TIMEOUT_MS) {
        const failResult = await settlementService.fail(svcCtx, {
          settlementId: settlement.id,
          reason: `Settlement timed out after ${Math.round(age / 1000)}s without on-chain confirmation.`,
        });
        if (failResult.ok) {
          timedOut++;
          log.warn("reconcile-settlements: marked settlement as FAILED (timeout)", {
            settlementId: settlement.id,
            ageMs: age,
          });
        } else {
          log.error("reconcile-settlements: failed to mark settlement as FAILED", {
            settlementId: settlement.id,
            error: String(failResult.error),
          });
        }
      } else {
        skipped++;
      }
    }

    log.info("reconcile-settlements: completed", { timedOut, skipped });
  };
}
