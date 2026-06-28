// External signal delivery and waiting for running workflow executions.
import type { WorkflowId, ExecutionId, SignalId, JsonValue } from "./types.js";
import { newSignalId } from "./types.js";

export type SignalStatus = "pending" | "delivered" | "expired";

export interface Signal {
  readonly signalId: SignalId;
  readonly workflowId: WorkflowId;
  readonly executionId: ExecutionId;
  readonly name: string;
  readonly payload: JsonValue;
  readonly status: SignalStatus;
  readonly sentAt: string;
  readonly deliveredAt: string | undefined;
  readonly expiresAt: string | undefined;
}

export interface SignalWaiter {
  readonly workflowId: WorkflowId;
  readonly executionId: ExecutionId;
  readonly signalName: string;
  readonly resolve: (payload: JsonValue) => void;
  readonly reject: (reason: unknown) => void;
  readonly registeredAt: string;
}

export interface SignalStore {
  send(input: Omit<Signal, "signalId" | "sentAt" | "status" | "deliveredAt">): Promise<Signal>;
  get(signalId: SignalId): Promise<Signal | undefined>;
  listPending(workflowId: WorkflowId, signalName: string): Promise<readonly Signal[]>;
  markDelivered(signalId: SignalId): Promise<Signal | undefined>;
  registerWaiter(waiter: SignalWaiter): void;
  resolveWaiters(workflowId: WorkflowId, signalName: string, payload: JsonValue): void;
}

/** Creates an in-memory signal store suitable for single-node or test environments. */
export function createInMemorySignalStore(): SignalStore {
  const signals = new Map<SignalId, Signal>();
  const waiters: SignalWaiter[] = [];

  return {
    async send(input) {
      const signal: Signal = {
        signalId: newSignalId(),
        sentAt: new Date().toISOString(),
        status: "pending",
        deliveredAt: undefined,
        ...input,
      };
      signals.set(signal.signalId, signal);
      return signal;
    },

    async get(signalId) {
      return signals.get(signalId);
    },

    async listPending(workflowId, signalName) {
      const result: Signal[] = [];
      for (const signal of signals.values()) {
        if (
          signal.workflowId === workflowId &&
          signal.name === signalName &&
          signal.status === "pending"
        ) {
          result.push(signal);
        }
      }
      return result;
    },

    async markDelivered(signalId) {
      const signal = signals.get(signalId);
      if (signal === undefined) return undefined;
      const delivered: Signal = {
        ...signal,
        status: "delivered",
        deliveredAt: new Date().toISOString(),
      };
      signals.set(signalId, delivered);
      return delivered;
    },

    registerWaiter(waiter) {
      waiters.push(waiter);
    },

    resolveWaiters(workflowId, signalName, payload) {
      for (let i = waiters.length - 1; i >= 0; i--) {
        const waiter = waiters[i];
        if (
          waiter !== undefined &&
          waiter.workflowId === workflowId &&
          waiter.signalName === signalName
        ) {
          waiter.resolve(payload);
          waiters.splice(i, 1);
        }
      }
    },
  };
}

/** Sends a named signal to a workflow execution with optional payload. */
export async function sendSignal(
  store: SignalStore,
  workflowId: WorkflowId,
  executionId: ExecutionId,
  name: string,
  payload: JsonValue = null,
  expiresAt?: string
): Promise<Signal> {
  const signal = await store.send({ workflowId, executionId, name, payload, expiresAt });
  store.resolveWaiters(workflowId, name, payload);
  return signal;
}

/** Returns a promise that resolves when the named signal is received for the execution. */
export function waitForSignal(
  store: SignalStore,
  workflowId: WorkflowId,
  executionId: ExecutionId,
  signalName: string,
  timeoutMs?: number
): Promise<JsonValue> {
  return new Promise<JsonValue>((resolve, reject) => {
    const waiter: SignalWaiter = {
      workflowId,
      executionId,
      signalName,
      resolve,
      reject,
      registeredAt: new Date().toISOString(),
    };
    store.registerWaiter(waiter);

    if (timeoutMs !== undefined) {
      const handle = setTimeout(() => {
        reject(new Error(`Signal '${signalName}' timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      // Wrap resolve to also clear timeout.
      const originalResolve = waiter.resolve;
      (waiter as { resolve: (v: JsonValue) => void }).resolve = (v) => {
        clearTimeout(handle);
        originalResolve(v);
      };
    }
  });
}
