// Public surface re-export for @veritas/queue-advanced.
export type {
  QueueMessage,
  ConsumeOptions,
  PriorityQueuePort,
  DelayQueuePort,
  PartitionedQueuePort,
  RateLimitedQueuePort,
  DeadLetterQueuePort,
  DeadLetterEntry,
  VisibilityEntry,
  VisibilityQueuePort,
  AckEntry,
  AckPort,
  BatchPort,
  SchedulerPort,
  QueueMetrics,
  MetricsPort,
  MetricEvent,
} from "./types.js";

export {
  QueueEmptyError,
  QueueFullError,
  PartitionNotFoundError,
  RateLimitExceededError,
  DeadLetterError,
  ReceiptNotFoundError,
  SchedulerError,
} from "./errors.js";

export { InMemoryPriorityQueue } from "./priority-queue.js";
export { InMemoryDelayQueue } from "./delay-queue.js";
export {
  InMemoryDeadLetterQueue,
  InMemoryVisibilityQueue,
  InMemoryPartitionedQueue,
  InMemoryRateLimitedQueue,
  InMemoryBatchQueue,
  InMemoryScheduler,
  InMemoryMetrics,
} from "./memory-impl.js";
