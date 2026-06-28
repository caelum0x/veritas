// Job handler that cancels PENDING orders that have exceeded their payment deadline.
import { epochToIso, type Logger } from "@veritas/core";
import { OrderService, systemContext } from "@veritas/services";
import type { JobExecutionContext } from "@veritas/scheduler";
import { asId } from "@veritas/core";

const SYSTEM_USER_ID = asId("system-scheduler", "user");
const PENDING_ORDER_TTL_MS = 30 * 60 * 1000; // 30 minutes

export interface ExpireOrdersJobDeps {
  readonly orderService: OrderService;
  readonly logger: Logger;
}

export function makeExpireOrdersHandler(deps: ExpireOrdersJobDeps) {
  const { orderService, logger } = deps;

  return async function expireOrdersHandler(ctx: JobExecutionContext): Promise<void> {
    const requestId = `expire-orders-${ctx.scheduledAt.toISOString()}`;
    const svcCtx = systemContext(SYSTEM_USER_ID, requestId, epochToIso(ctx.scheduledAt.getTime()));
    const log = logger.child({ jobId: ctx.jobId, requestId });

    const listResult = await orderService.list(svcCtx, { status: "PENDING", limit: 200 });
    if (!listResult.ok) {
      log.error("expire-orders: failed to list pending orders", { error: String(listResult.error) });
      throw listResult.error;
    }

    const now = ctx.scheduledAt.getTime();
    const expiredOrders = listResult.value.items.filter((order) => {
      const createdAt = new Date(order.createdAt).getTime();
      return now - createdAt > PENDING_ORDER_TTL_MS;
    });

    log.info("expire-orders: found expired orders", { count: expiredOrders.length });

    let cancelled = 0;
    let failed = 0;

    for (const order of expiredOrders) {
      const cancelResult = await orderService.cancel(svcCtx, order.id);
      if (cancelResult.ok) {
        cancelled++;
      } else {
        failed++;
        log.warn("expire-orders: failed to cancel order", {
          orderId: order.id,
          error: String(cancelResult.error),
        });
      }
    }

    log.info("expire-orders: completed", { cancelled, failed });
  };
}
