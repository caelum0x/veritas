// Handler for expire-orders jobs: transitions stale open orders to "expired" status.
import { z } from "zod";
import {
  Result,
  ok,
  err,
  ValidationError,
  InternalError,
  Logger,
  noopLogger,
  epochToIso,
  IsoTimestamp,
} from "@veritas/core";
import { Job } from "../queue/job.js";
import { JobHandler } from "../handler.js";

const ExpireOrdersPayloadSchema = z.object({
  /** Orders older than this age (ms) without fulfillment are expired. Defaults to 1 hour. */
  maxAgeMs: z.number().int().positive().optional(),
  /** Maximum number of orders to expire in one pass. */
  batchSize: z.number().int().positive().max(500).optional(),
});

export type ExpireOrdersPayload = z.infer<typeof ExpireOrdersPayloadSchema>;

export interface StaleOrder {
  readonly id: string;
  readonly organizationId: string;
  readonly status: string;
  readonly createdAt: IsoTimestamp;
}

export interface OrderService {
  /** Return orders in "open" or "pending" status created before the cutoff timestamp. */
  listStale(cutoffTimestamp: IsoTimestamp, limit: number): Promise<Result<StaleOrder[]>>;
  /** Transition the order to "expired" status. */
  expire(orderId: string, reason: string): Promise<Result<void>>;
}

export class ExpireOrdersHandler implements JobHandler<ExpireOrdersPayload> {
  constructor(
    private readonly orderService: OrderService,
    private readonly logger: Logger = noopLogger
  ) {}

  async handle(job: Job<ExpireOrdersPayload>): Promise<Result<void>> {
    const parsed = ExpireOrdersPayloadSchema.safeParse(job.payload);
    if (!parsed.success) {
      const msg = parsed.error.errors.map((e) => e.message).join("; ");
      return err(new ValidationError({ message: `Invalid expire-orders payload: ${msg}` }));
    }

    const { maxAgeMs = 3_600_000, batchSize = 100 } = parsed.data;
    const cutoffMs = Date.now() - maxAgeMs;
    const cutoff: IsoTimestamp = epochToIso(cutoffMs);

    this.logger.info("expire-orders: fetching stale orders", {
      cutoff,
      maxAgeMs,
      batchSize,
      jobId: job.id,
    });

    const listResult = await this.orderService.listStale(cutoff, batchSize);
    if (!listResult.ok) {
      const listErrMsg = listResult.error instanceof Error ? listResult.error.message : String(listResult.error);
      return err(new InternalError({ message: `Failed to list stale orders: ${listErrMsg}` }));
    }

    const orders = listResult.value;
    this.logger.info("expire-orders: found stale orders", { count: orders.length, jobId: job.id });

    let expired = 0;
    let errored = 0;

    for (const order of orders) {
      const reason = `Order exceeded maximum age of ${maxAgeMs}ms without fulfillment`;
      const result = await this.orderService.expire(order.id, reason);
      if (!result.ok) {
        const expireErrMsg = result.error instanceof Error ? result.error.message : String(result.error);
        this.logger.warn("expire-orders: failed to expire order", {
          orderId: order.id,
          error: expireErrMsg,
        });
        errored++;
      } else {
        expired++;
        this.logger.info("expire-orders: expired order", {
          orderId: order.id,
          organizationId: order.organizationId,
          createdAt: order.createdAt,
        });
      }
    }

    this.logger.info("expire-orders: complete", { jobId: job.id, expired, errored });

    if (errored > 0 && errored === orders.length && orders.length > 0) {
      return err(new InternalError({ message: `All ${errored} order expirations failed` }));
    }

    return ok(undefined);
  }
}
