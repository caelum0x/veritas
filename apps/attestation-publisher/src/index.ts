// Public surface of the attestation-publisher app — re-exports for programmatic use.

export { AttestationQueue } from "./queue.js";
export type { QueueEntry } from "./queue.js";

export { buildBatch } from "./batcher.js";
export type { MerkleBatch } from "./batcher.js";

export { PublisherService } from "./publisher-service.js";
export type { PublishResult } from "./publisher-service.js";

export { PublisherScheduler } from "./scheduler.js";
export type { SchedulerStatus } from "./scheduler.js";

export { AnchorStatusTracker } from "./status.js";
export type { AnchorRecord, ConfirmationStatus } from "./status.js";

export { MockAnchorSubmitPort } from "./submit.js";
export type { AnchorSubmitPort, AnchorTxRequest, AnchorTxReceipt } from "./submit.js";

export { bootstrap } from "./bootstrap.js";
export type { PublisherContainer } from "./bootstrap.js";

export { loadPublisherConfig } from "./config.js";
export type { PublisherConfig } from "./config.js";
