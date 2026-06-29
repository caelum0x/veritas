// Handler for aggregate-usage jobs: rolls up raw usage events into billing-ready totals.
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

const AggregateUsagePayloadSchema = z.object({
  /** Start of the aggregation window (ISO timestamp). Defaults to 1 hour ago. */
  windowStart: z.string().optional(),
  /** End of the aggregation window (ISO timestamp). Defaults to now. */
  windowEnd: z.string().optional(),
  /** Only aggregate usage for this organization (omit to aggregate all). */
  organizationId: z.string().optional(),
});

export type AggregateUsagePayload = z.infer<typeof AggregateUsagePayloadSchema>;

export interface UsageEvent {
  readonly id: string;
  readonly organizationId: string;
  readonly metric: string;
  readonly quantity: number;
  readonly occurredAt: IsoTimestamp;
}

export interface UsageAggregate {
  readonly organizationId: string;
  readonly metric: string;
  readonly total: number;
  readonly windowStart: IsoTimestamp;
  readonly windowEnd: IsoTimestamp;
  readonly eventCount: number;
}

export interface UsageService {
  /** Return raw usage events within the time window, optionally filtered by org. */
  listEvents(
    windowStart: IsoTimestamp,
    windowEnd: IsoTimestamp,
    organizationId?: string
  ): Promise<Result<UsageEvent[]>>;
  /** Persist the rolled-up aggregate. Implementations must handle upserts. */
  saveAggregate(aggregate: UsageAggregate): Promise<Result<void>>;
}

export class AggregateUsageHandler implements JobHandler<AggregateUsagePayload> {
  constructor(
    private readonly usageService: UsageService,
    private readonly logger: Logger = noopLogger
  ) {}

  async handle(job: Job<AggregateUsagePayload>): Promise<Result<void>> {
    const parsed = AggregateUsagePayloadSchema.safeParse(job.payload);
    if (!parsed.success) {
      const msg = parsed.error.errors.map((e) => e.message).join("; ");
      return err(new ValidationError({ message: `Invalid aggregate-usage payload: ${msg}` }));
    }

    const now = Date.now();
    const { windowStart, windowEnd, organizationId } = parsed.data;

    const start: IsoTimestamp = windowStart
      ? (windowStart as IsoTimestamp)
      : epochToIso(now - 3_600_000);
    const end: IsoTimestamp = windowEnd ? (windowEnd as IsoTimestamp) : epochToIso(now);

    this.logger.info("aggregate-usage: fetching events", {
      windowStart: start,
      windowEnd: end,
      organizationId,
      jobId: job.id,
    });

    const listResult = await this.usageService.listEvents(start, end, organizationId);
    if (!listResult.ok) {
      const listErrMsg = listResult.error instanceof Error ? listResult.error.message : String(listResult.error);
      return err(new InternalError({ message: `Failed to list usage events: ${listErrMsg}` }));
    }

    const events = listResult.value;
    this.logger.info("aggregate-usage: rolling up events", { count: events.length, jobId: job.id });

    if (events.length === 0) {
      this.logger.info("aggregate-usage: no events in window, skipping", { jobId: job.id });
      return ok(undefined);
    }

    // Group events by organizationId + metric and sum quantities.
    const buckets = new Map<string, UsageAggregate>();
    for (const event of events) {
      const key = `${event.organizationId}::${event.metric}`;
      const existing = buckets.get(key);
      if (existing) {
        buckets.set(key, {
          ...existing,
          total: existing.total + event.quantity,
          eventCount: existing.eventCount + 1,
        });
      } else {
        buckets.set(key, {
          organizationId: event.organizationId,
          metric: event.metric,
          total: event.quantity,
          windowStart: start,
          windowEnd: end,
          eventCount: 1,
        });
      }
    }

    let saved = 0;
    let errored = 0;
    for (const aggregate of buckets.values()) {
      const saveResult = await this.usageService.saveAggregate(aggregate);
      if (!saveResult.ok) {
        const saveErrMsg = saveResult.error instanceof Error ? saveResult.error.message : String(saveResult.error);
        this.logger.warn("aggregate-usage: failed to save aggregate", {
          organizationId: aggregate.organizationId,
          metric: aggregate.metric,
          error: saveErrMsg,
        });
        errored++;
      } else {
        saved++;
      }
    }

    this.logger.info("aggregate-usage: complete", {
      jobId: job.id,
      bucketsTotal: buckets.size,
      saved,
      errored,
    });

    if (errored > 0 && saved === 0) {
      return err(new InternalError({ message: `All ${errored} usage aggregates failed to save` }));
    }

    return ok(undefined);
  }
}
