// Handler for generate-invoice jobs: aggregates monthly usage and creates an invoice per subscription.
import { z } from "zod";
import { Result, ok, err, ValidationError, InternalError, Logger, noopLogger } from "@veritas/core";
import { Job } from "../queue/job.js";
import { JobHandler } from "../handler.js";

const GenerateInvoicePayloadSchema = z.object({
  /** ISO month string, e.g. "2026-05" */
  billingMonth: z.string().regex(/^\d{4}-\d{2}$/, "billingMonth must be YYYY-MM"),
  /** If set, only generate invoice for this subscription. Otherwise process all active ones. */
  subscriptionId: z.string().min(1).optional(),
  /** Idempotency key to prevent duplicate invoice generation. */
  idempotencyKey: z.string().min(1),
});

export type GenerateInvoicePayload = z.infer<typeof GenerateInvoicePayloadSchema>;

export interface InvoiceService {
  generateMonthlyInvoices(
    billingMonth: string,
    idempotencyKey: string,
    subscriptionId?: string
  ): Promise<Result<{ invoicesCreated: number; invoicesSkipped: number }>>;
}

export class GenerateInvoiceHandler implements JobHandler<GenerateInvoicePayload> {
  constructor(
    private readonly invoiceService: InvoiceService,
    private readonly logger: Logger = noopLogger
  ) {}

  async handle(job: Job<GenerateInvoicePayload>): Promise<Result<void>> {
    const parsed = GenerateInvoicePayloadSchema.safeParse(job.payload);
    if (!parsed.success) {
      const msg = parsed.error.errors.map((e) => e.message).join("; ");
      return err(new ValidationError({ message: `Invalid generate-invoice payload: ${msg}` }));
    }

    const { billingMonth, subscriptionId, idempotencyKey } = parsed.data;

    this.logger.info("generate-invoice: starting", {
      billingMonth,
      subscriptionId: subscriptionId ?? "all",
      idempotencyKey,
      jobId: job.id,
    });

    const result = await this.invoiceService.generateMonthlyInvoices(
      billingMonth,
      idempotencyKey,
      subscriptionId
    );

    if (!result.ok) {
      const invoiceErrMsg = result.error instanceof Error ? result.error.message : String(result.error);
      this.logger.error("generate-invoice: service error", {
        billingMonth,
        jobId: job.id,
        error: invoiceErrMsg,
      });
      return err(new InternalError({ message: `Invoice generation failed: ${invoiceErrMsg}` }));
    }

    const { invoicesCreated, invoicesSkipped } = result.value;
    this.logger.info("generate-invoice: completed", {
      billingMonth,
      invoicesCreated,
      invoicesSkipped,
      jobId: job.id,
    });

    return ok(undefined);
  }
}
