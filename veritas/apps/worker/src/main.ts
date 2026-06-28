// Worker entrypoint: wires dependencies, starts the poll loop and scheduler.
import { noopLogger, sleep, ok } from "@veritas/core";
import { MemoryQueue } from "./queue/memory-queue.js";
import { Worker } from "./worker.js";
import { Dispatcher } from "./dispatcher.js";
import { Scheduler } from "./scheduler.js";
import { loadWorkerConfig } from "./config.js";
import { RunVerificationHandler, VerificationService } from "./handlers/run-verification.handler.js";
import { DeliverWebhookHandler, WebhookDeliveryService } from "./handlers/deliver-webhook.handler.js";
import { GenerateInvoiceHandler, InvoiceService } from "./handlers/generate-invoice.handler.js";
import { ReconcileSettlementsHandler, SettlementService } from "./handlers/reconcile-settlements.handler.js";
import { ExpireOrdersHandler, OrderService } from "./handlers/expire-orders.handler.js";
import { AggregateUsageHandler, UsageService } from "./handlers/aggregate-usage.handler.js";

// Placeholder no-op service stubs — replace with real implementations in production.
const noopVerificationService: VerificationService = {
  verify: async () => ok({ reportId: "", verdict: "" }),
};

const noopWebhookDeliveryService: WebhookDeliveryService = {
  deliver: async () => ok({ statusCode: 200 }),
};

const noopInvoiceService: InvoiceService = {
  generateMonthlyInvoices: async () => ok({ invoicesCreated: 0, invoicesSkipped: 0 }),
};

const noopSettlementService: SettlementService = {
  listPending: async () => ok([]),
  confirm: async () => ok({ confirmed: true }),
  reject: async () => ok(undefined),
};

const noopOrderService: OrderService = {
  listStale: async () => ok([]),
  expire: async () => ok(undefined),
};

const noopUsageService: UsageService = {
  listEvents: async () => ok([]),
  saveAggregate: async () => ok(undefined),
};

export async function main(): Promise<void> {
  const config = loadWorkerConfig();
  const logger = noopLogger; // replace with observability logger in production

  const queue = new MemoryQueue();

  const dispatcher = new Dispatcher(logger);
  dispatcher.register("run-verification", new RunVerificationHandler(noopVerificationService, logger));
  dispatcher.register("deliver-webhook", new DeliverWebhookHandler(noopWebhookDeliveryService, logger));
  dispatcher.register("generate-invoice", new GenerateInvoiceHandler(noopInvoiceService, logger));
  dispatcher.register("reconcile-settlements", new ReconcileSettlementsHandler(noopSettlementService, logger));
  dispatcher.register("expire-orders", new ExpireOrdersHandler(noopOrderService, logger));
  dispatcher.register("aggregate-usage", new AggregateUsageHandler(noopUsageService, logger));

  const worker = new Worker(queue, dispatcher, config, logger);

  const scheduler = new Scheduler(queue, { entries: [], logger });
  scheduler.start();

  const shutdown = (): void => {
    logger.info("Shutdown signal received");
    worker.stop();
    scheduler.stop();
    // allow in-flight jobs a moment to finish
    void sleep(2000).then(() => process.exit(0));
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  await worker.start();
}

main().catch((err: unknown) => {
  console.error("Fatal worker error", err);
  process.exit(1);
});
