// Handler for reconcile-settlements jobs: checks on-chain USDC settlements and updates records.
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

const ReconcileSettlementsPayloadSchema = z.object({
  /** ISO timestamp — only look at settlements created after this point. */
  fromTimestamp: z.string().optional(),
  /** Maximum number of settlements to reconcile in one pass. */
  batchSize: z.number().int().positive().max(500).optional(),
});

export type ReconcileSettlementsPayload = z.infer<typeof ReconcileSettlementsPayloadSchema>;

export interface PendingSettlement {
  readonly id: string;
  readonly orderId: string;
  readonly txHash: string;
  readonly amountUsdc: string;
  readonly createdAt: IsoTimestamp;
}

export interface SettlementService {
  /** Return all settlements in "pending" or "confirming" status since the given time. */
  listPending(fromTimestamp: IsoTimestamp, limit: number): Promise<Result<PendingSettlement[]>>;
  /** Verify and confirm a settlement against on-chain data. */
  confirm(settlementId: string, txHash: string): Promise<Result<{ confirmed: boolean; reason?: string }>>;
  /** Mark a settlement as failed if on-chain data does not match. */
  reject(settlementId: string, reason: string): Promise<Result<void>>;
}

export class ReconcileSettlementsHandler implements JobHandler<ReconcileSettlementsPayload> {
  constructor(
    private readonly settlementService: SettlementService,
    private readonly logger: Logger = noopLogger
  ) {}

  async handle(job: Job<ReconcileSettlementsPayload>): Promise<Result<void>> {
    const parsed = ReconcileSettlementsPayloadSchema.safeParse(job.payload);
    if (!parsed.success) {
      const msg = parsed.error.errors.map((e) => e.message).join("; ");
      return err(new ValidationError({ message: `Invalid reconcile-settlements payload: ${msg}` }));
    }

    const { fromTimestamp, batchSize = 100 } = parsed.data;
    const since: IsoTimestamp = fromTimestamp
      ? (fromTimestamp as IsoTimestamp)
      : epochToIso(Date.now() - 3_600_000); // default: last 1 hour

    this.logger.info("reconcile-settlements: fetching pending", { since, batchSize, jobId: job.id });

    const listResult = await this.settlementService.listPending(since, batchSize);
    if (!listResult.ok) {
      const listErrMsg = listResult.error instanceof Error ? listResult.error.message : String(listResult.error);
      return err(new InternalError({ message: `Failed to list pending settlements: ${listErrMsg}` }));
    }

    const settlements = listResult.value;
    this.logger.info("reconcile-settlements: found pending settlements", {
      count: settlements.length,
      jobId: job.id,
    });

    let confirmed = 0;
    let rejected = 0;
    let errored = 0;

    for (const settlement of settlements) {
      const confirmResult = await this.settlementService.confirm(settlement.id, settlement.txHash);
      if (!confirmResult.ok) {
        const confirmErrMsg = confirmResult.error instanceof Error ? confirmResult.error.message : String(confirmResult.error);
        this.logger.warn("reconcile-settlements: confirm error", {
          settlementId: settlement.id,
          error: confirmErrMsg,
        });
        errored++;
        continue;
      }

      if (confirmResult.value.confirmed) {
        confirmed++;
        this.logger.info("reconcile-settlements: settlement confirmed", {
          settlementId: settlement.id,
          orderId: settlement.orderId,
        });
      } else {
        const reason = confirmResult.value.reason ?? "on-chain data mismatch";
        const rejectResult = await this.settlementService.reject(settlement.id, reason);
        if (!rejectResult.ok) {
          const rejectErrMsg = rejectResult.error instanceof Error ? rejectResult.error.message : String(rejectResult.error);
          this.logger.warn("reconcile-settlements: reject error", {
            settlementId: settlement.id,
            error: rejectErrMsg,
          });
          errored++;
        } else {
          rejected++;
          this.logger.warn("reconcile-settlements: settlement rejected", {
            settlementId: settlement.id,
            reason,
          });
        }
      }
    }

    this.logger.info("reconcile-settlements: complete", {
      jobId: job.id,
      confirmed,
      rejected,
      errored,
    });

    if (errored > 0 && errored === settlements.length) {
      return err(new InternalError({ message: `All ${errored} settlement reconciliations errored` }));
    }

    return ok(undefined);
  }
}
