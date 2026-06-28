// Durable timer management for workflow sleep and deadline scheduling.
import type { WorkflowId, ExecutionId, TimerId } from "./types.js";
import { newTimerId } from "./types.js";

export type TimerStatus = "pending" | "fired" | "cancelled";

export interface DurableTimer {
  readonly timerId: TimerId;
  readonly workflowId: WorkflowId;
  readonly executionId: ExecutionId;
  readonly fireAt: string;
  readonly status: TimerStatus;
  readonly label: string;
  readonly createdAt: string;
}

export interface TimerStore {
  schedule(timer: Omit<DurableTimer, "timerId" | "createdAt" | "status">): Promise<DurableTimer>;
  cancel(timerId: TimerId): Promise<boolean>;
  get(timerId: TimerId): Promise<DurableTimer | undefined>;
  listPending(before: string): Promise<readonly DurableTimer[]>;
  markFired(timerId: TimerId): Promise<DurableTimer | undefined>;
}

/** Creates a new in-memory timer store for testing or single-node deployments. */
export function createInMemoryTimerStore(): TimerStore {
  const timers = new Map<TimerId, DurableTimer>();

  return {
    async schedule(input) {
      const timer: DurableTimer = {
        timerId: newTimerId(),
        createdAt: new Date().toISOString(),
        status: "pending",
        ...input,
      };
      timers.set(timer.timerId, timer);
      return timer;
    },

    async cancel(timerId) {
      const timer = timers.get(timerId);
      if (timer === undefined || timer.status !== "pending") return false;
      timers.set(timerId, { ...timer, status: "cancelled" });
      return true;
    },

    async get(timerId) {
      return timers.get(timerId);
    },

    async listPending(before) {
      const result: DurableTimer[] = [];
      for (const timer of timers.values()) {
        if (timer.status === "pending" && timer.fireAt <= before) {
          result.push(timer);
        }
      }
      return result;
    },

    async markFired(timerId) {
      const timer = timers.get(timerId);
      if (timer === undefined) return undefined;
      const fired = { ...timer, status: "fired" as TimerStatus };
      timers.set(timerId, fired);
      return fired;
    },
  };
}

/** Schedules a timer that fires after the given duration in milliseconds. */
export async function sleepUntil(
  store: TimerStore,
  workflowId: WorkflowId,
  executionId: ExecutionId,
  fireAt: Date,
  label: string
): Promise<DurableTimer> {
  return store.schedule({
    workflowId,
    executionId,
    fireAt: fireAt.toISOString(),
    label,
  });
}

/** Schedules a timer that fires after a relative delay from now. */
export async function sleepFor(
  store: TimerStore,
  workflowId: WorkflowId,
  executionId: ExecutionId,
  delayMs: number,
  label: string
): Promise<DurableTimer> {
  const fireAt = new Date(Date.now() + delayMs);
  return sleepUntil(store, workflowId, executionId, fireAt, label);
}

/** Polls a timer store and fires all timers due before now, returning fired timers. */
export async function tickTimers(store: TimerStore): Promise<readonly DurableTimer[]> {
  const now = new Date().toISOString();
  const due = await store.listPending(now);
  const fired: DurableTimer[] = [];
  for (const timer of due) {
    const result = await store.markFired(timer.timerId);
    if (result !== undefined) fired.push(result);
  }
  return fired;
}
