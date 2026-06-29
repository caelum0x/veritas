// Public surface re-exports for @veritas/scheduler-app.
export { bootstrap } from "./bootstrap.js";
export type { BootstrapResult } from "./bootstrap.js";

export { SCHEDULE_TABLE } from "./schedule-table.js";
export type { ScheduleTableEntry, ScheduledJobId } from "./schedule-table.js";

export { makeExpireOrdersHandler } from "./jobs/expire-orders.job.js";
export type { ExpireOrdersJobDeps } from "./jobs/expire-orders.job.js";

export { makeRollupUsageHandler } from "./jobs/rollup-usage.job.js";
export type { RollupUsageJobDeps } from "./jobs/rollup-usage.job.js";

export { makeReconcileSettlementsHandler } from "./jobs/reconcile-settlements.job.js";
export type { ReconcileSettlementsJobDeps } from "./jobs/reconcile-settlements.job.js";

export { makeRetryWebhooksHandler } from "./jobs/retry-webhooks.job.js";
export type { WebhookRetryPort, FailedDelivery } from "./jobs/retry-webhooks.job.js";

export { makeGenerateInvoicesHandler } from "./jobs/generate-invoices.job.js";
export type { InvoiceGenerationPort } from "./jobs/generate-invoices.job.js";

export { makePruneAuditHandler } from "./jobs/prune-audit.job.js";
export type { AuditPrunePort } from "./jobs/prune-audit.job.js";
