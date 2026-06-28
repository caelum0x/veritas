// Queue metrics: collects and exposes operational counters and histograms for queues.
import type { Clock } from "@veritas/core";
import { systemClock } from "@veritas/core";

/** Snapshot of queue metrics at a point in time */
export interface QueueMetricsSnapshot {
  readonly queueName: string;
  readonly depth: number;
  readonly inFlight: number;
  readonly enqueued: number;
  readonly dequeued: number;
  readonly acked: number;
  readonly nacked: number;
  readonly deadLettered: number;
  readonly expired: number;
  readonly avgProcessingMs: number;
  readonly p99ProcessingMs: number;
  readonly capturedAt: number; // epoch ms
}

/** Port implemented by any metrics backend */
export interface QueueMetricsPort {
  recordEnqueue(queueName: string): void;
  recordDequeue(queueName: string): void;
  recordAck(queueName: string, processingMs: number): void;
  recordNack(queueName: string): void;
  recordDeadLetter(queueName: string): void;
  recordExpired(queueName: string): void;
  setDepth(queueName: string, depth: number): void;
  setInFlight(queueName: string, count: number): void;
  snapshot(queueName: string): QueueMetricsSnapshot;
  allSnapshots(): QueueMetricsSnapshot[];
}

interface MutableCounters {
  depth: number;
  inFlight: number;
  enqueued: number;
  dequeued: number;
  acked: number;
  nacked: number;
  deadLettered: number;
  expired: number;
  processingTimes: number[];
}

const emptyCounters = (): MutableCounters => ({
  depth: 0,
  inFlight: 0,
  enqueued: 0,
  dequeued: 0,
  acked: 0,
  nacked: 0,
  deadLettered: 0,
  expired: 0,
  processingTimes: [],
});

const percentile = (sorted: number[], p: number): number => {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)] ?? 0;
};

const average = (values: number[]): number => {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
};

/** In-memory metrics collector; thread-unsafe but sufficient for single-process usage */
export class InMemoryQueueMetrics implements QueueMetricsPort {
  private readonly counters = new Map<string, MutableCounters>();

  constructor(private readonly clock: Clock = systemClock) {}

  private get(queueName: string): MutableCounters {
    let c = this.counters.get(queueName);
    if (c === undefined) {
      c = emptyCounters();
      this.counters.set(queueName, c);
    }
    return c;
  }

  recordEnqueue(queueName: string): void {
    this.get(queueName).enqueued++;
  }

  recordDequeue(queueName: string): void {
    this.get(queueName).dequeued++;
  }

  recordAck(queueName: string, processingMs: number): void {
    const c = this.get(queueName);
    c.acked++;
    c.processingTimes.push(processingMs);
    // Cap history to last 10k samples to bound memory
    if (c.processingTimes.length > 10_000) {
      c.processingTimes.splice(0, c.processingTimes.length - 10_000);
    }
  }

  recordNack(queueName: string): void {
    this.get(queueName).nacked++;
  }

  recordDeadLetter(queueName: string): void {
    this.get(queueName).deadLettered++;
  }

  recordExpired(queueName: string): void {
    this.get(queueName).expired++;
  }

  setDepth(queueName: string, depth: number): void {
    this.get(queueName).depth = depth;
  }

  setInFlight(queueName: string, count: number): void {
    this.get(queueName).inFlight = count;
  }

  snapshot(queueName: string): QueueMetricsSnapshot {
    const c = this.get(queueName);
    const sorted = [...c.processingTimes].sort((a, b) => a - b);
    return {
      queueName,
      depth: c.depth,
      inFlight: c.inFlight,
      enqueued: c.enqueued,
      dequeued: c.dequeued,
      acked: c.acked,
      nacked: c.nacked,
      deadLettered: c.deadLettered,
      expired: c.expired,
      avgProcessingMs: average(sorted),
      p99ProcessingMs: percentile(sorted, 99),
      capturedAt: this.clock.now(),
    };
  }

  allSnapshots(): QueueMetricsSnapshot[] {
    return [...this.counters.keys()].map((name) => this.snapshot(name));
  }

  /** Reset all counters for a queue (useful in tests) */
  reset(queueName: string): void {
    this.counters.set(queueName, emptyCounters());
  }
}
