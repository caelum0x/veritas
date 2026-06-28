// SagaState: immutable snapshot of a running or completed saga instance.
import { type IsoTimestamp } from "@veritas/core";

export type SagaStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "compensating"
  | "compensated";

export interface StepRecord {
  readonly name: string;
  readonly status: "pending" | "running" | "completed" | "failed" | "compensated";
  readonly startedAt?: IsoTimestamp;
  readonly completedAt?: IsoTimestamp;
  readonly error?: string;
  readonly output?: unknown;
}

export interface SagaState {
  readonly sagaId: string;
  readonly sagaName: string;
  readonly status: SagaStatus;
  readonly steps: readonly StepRecord[];
  readonly input: unknown;
  readonly output?: unknown;
  readonly error?: string;
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
  readonly completedAt?: IsoTimestamp;
}

/** Produce an updated SagaState without mutating the original. */
export function updateSagaState(
  state: SagaState,
  patch: Partial<Omit<SagaState, "sagaId" | "sagaName" | "createdAt" | "input">>,
  now: IsoTimestamp,
): SagaState {
  return { ...state, ...patch, updatedAt: now };
}

/** Produce an updated StepRecord inside a SagaState by step name. */
export function updateStep(
  state: SagaState,
  stepName: string,
  patch: Partial<Omit<StepRecord, "name">>,
  now: IsoTimestamp,
): SagaState {
  const steps = state.steps.map((s) =>
    s.name === stepName ? { ...s, ...patch } : s,
  );
  return updateSagaState(state, { steps }, now);
}

/** Build the initial SagaState for a new saga run. */
export function initialSagaState(
  sagaId: string,
  sagaName: string,
  stepNames: readonly string[],
  input: unknown,
  now: IsoTimestamp,
): SagaState {
  const steps: StepRecord[] = stepNames.map((name) => ({
    name,
    status: "pending",
  }));
  return {
    sagaId,
    sagaName,
    status: "pending",
    steps,
    input,
    createdAt: now,
    updatedAt: now,
  };
}
