// subscribe-and-bill.flow.ts: subscription -> usage aggregation -> invoice generation
import {
  ok,
  err,
  isErr,
  type Result,
  type AppError,
  type Logger,
  type EventBus,
  epochToIso,
  newId,
  InternalError,
  type Id,
} from "@veritas/core";
import { InvoiceGenerator, type GenerateInvoiceInput } from "@veritas/billing";
import type { Plan } from "@veritas/billing";
import { aggregateUsage } from "@veritas/billing";
import type { MeteringEvent } from "@veritas/billing";
import { UsageMeter } from "@veritas/usage-billing";
import type { UsageEvent } from "@veritas/usage-billing";

export interface SubscribeAndBillDeps {
  readonly usageMeter: UsageMeter;
  readonly invoiceGenerator: InvoiceGenerator;
  readonly eventBus: EventBus;
  readonly logger: Logger;
}

export interface SubscribeAndBillInput {
  readonly organizationId: string;
  readonly subscriptionId: string;
  readonly plan: Plan;
  readonly periodStart: string;
  readonly periodEnd: string;
}

export interface SubscribeAndBillOutput {
  readonly invoiceId: string;
  readonly organizationId: string;
  readonly subscriptionId: string;
  readonly totalAmount: string;
  readonly lineItemCount: number;
  readonly generatedAt: string;
}

/** Flush usage events, aggregate per period, and generate an invoice for a subscription cycle. */
export async function subscribeAndBill(
  input: SubscribeAndBillInput,
  deps: SubscribeAndBillDeps,
): Promise<Result<SubscribeAndBillOutput, AppError>> {
  const { organizationId, subscriptionId, plan, periodStart, periodEnd } = input;
  const { usageMeter, invoiceGenerator, eventBus, logger } = deps;

  // Step 1: Flush buffered usage events from the meter
  const rawEvents = usageMeter.flush();

  // Step 2: Filter events to this org and period, convert to MeteringEvent shape
  const meteringEvents: MeteringEvent[] = rawEvents
    .filter((e: UsageEvent) => {
      const orgMatch = e.organizationId === organizationId;
      const afterStart = e.occurredAt >= periodStart;
      const beforeEnd = e.occurredAt < periodEnd;
      return orgMatch && afterStart && beforeEnd;
    })
    .map((e: UsageEvent) => ({
      id: e.id as Id<"metering">,
      organizationId: e.organizationId as Id<string>,
      userId: (e.userId ?? null) as Id<string> | null,
      metric: e.metric,
      quantity: e.quantity,
      occurredAt: e.occurredAt as ReturnType<typeof epochToIso>,
      metadata: e.metadata,
    }));

  // Step 3: Aggregate usage per metric per period
  const aggregated = aggregateUsage(meteringEvents, "month");

  // Step 4: Generate invoice
  const generateInput: GenerateInvoiceInput = {
    organizationId: organizationId as Id<"org">,
    plan,
    periodStart: periodStart as ReturnType<typeof epochToIso>,
    periodEnd: periodEnd as ReturnType<typeof epochToIso>,
    usages: aggregated,
    subscriptionId: subscriptionId as Id<"sub">,
  };

  const invoiceResult = invoiceGenerator.generate(generateInput);
  if (isErr(invoiceResult)) {
    logger.error("subscribe_and_bill.invoice_failed", {
      organizationId,
      subscriptionId,
      error: invoiceResult.error.message,
    });
    return err(new InternalError({ message: invoiceResult.error.message }));
  }

  const invoice = invoiceResult.value;
  const generatedAt = epochToIso(Date.now());

  // Step 5: Publish event
  await eventBus.publish({
    id: newId("evt"),
    type: "commerce.subscribe_and_bill.invoiced",
    occurredAt: generatedAt,
    payload: {
      invoiceId: invoice.id,
      organizationId,
      subscriptionId,
      totalAmount: invoice.total.amount,
    },
  } as Parameters<typeof eventBus.publish>[0]);

  logger.info("subscribe_and_bill.completed", {
    invoiceId: invoice.id,
    organizationId,
    subscriptionId,
    totalAmount: invoice.total.amount,
    lineItemCount: invoice.lineItems.length,
  });

  return ok({
    invoiceId: invoice.id,
    organizationId,
    subscriptionId,
    totalAmount: invoice.total.amount,
    lineItemCount: invoice.lineItems.length,
    generatedAt,
  });
}
