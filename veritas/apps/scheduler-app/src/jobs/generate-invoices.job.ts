// Scheduled job: generate monthly billing invoices for all active subscriptions.
import { type JobHandler, type JobExecutionContext } from "@veritas/scheduler";
import { type Logger, noopLogger } from "@veritas/core";
import { z } from "zod";

const GenerateInvoicesPayloadSchema = z.object({
  /** ISO billing month, e.g. "2026-05". Defaults to the previous calendar month. */
  billingMonth: z.string().regex(/^\d{4}-\d{2}$/, "billingMonth must be YYYY-MM").optional(),
  /** Idempotency key to prevent duplicate invoice generation. */
  idempotencyKey: z.string().min(1).optional(),
  /** If set, only generate an invoice for this subscription. */
  subscriptionId: z.string().min(1).optional(),
});

export interface InvoiceGenerationPort {
  generateMonthlyInvoices(
    billingMonth: string,
    idempotencyKey: string,
    subscriptionId?: string,
  ): Promise<{ invoicesCreated: number; invoicesSkipped: number }>;
}

/** Derive previous billing month as "YYYY-MM" from the current date. */
function previousBillingMonth(now: Date): string {
  const d = new Date(now.getUTCFullYear(), now.getUTCMonth() - 1, 1);
  const yyyy = d.getUTCFullYear().toString();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
}

/** Returns a JobHandler that generates monthly invoices for all active subscriptions. */
export function makeGenerateInvoicesHandler(
  invoices: InvoiceGenerationPort,
  logger: Logger = noopLogger,
): JobHandler {
  return async (ctx: JobExecutionContext): Promise<void> => {
    const parsed = GenerateInvoicesPayloadSchema.safeParse(ctx.payload);
    if (!parsed.success) {
      throw new Error(
        `Invalid generate-invoices payload: ${parsed.error.errors.map((e) => e.message).join("; ")}`,
      );
    }

    const billingMonth = parsed.data.billingMonth ?? previousBillingMonth(ctx.scheduledAt);
    const idempotencyKey =
      parsed.data.idempotencyKey ?? `generate-invoices:${billingMonth}:${ctx.jobId}`;
    const subscriptionId = parsed.data.subscriptionId;

    logger.info("generate-invoices: starting", {
      billingMonth,
      subscriptionId: subscriptionId ?? "all",
      idempotencyKey,
      jobId: ctx.jobId,
    });

    const result = await invoices.generateMonthlyInvoices(
      billingMonth,
      idempotencyKey,
      subscriptionId,
    );

    logger.info("generate-invoices: complete", {
      billingMonth,
      invoicesCreated: result.invoicesCreated,
      invoicesSkipped: result.invoicesSkipped,
      jobId: ctx.jobId,
    });
  };
}
