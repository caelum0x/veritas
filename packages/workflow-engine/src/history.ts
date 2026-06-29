// Append-only event history for durable workflow execution tracking.
import type { JsonValue, WorkflowId, ExecutionId, ActivityId, TimerId, SignalId } from "./types.js";

export type WorkflowHistoryEventType =
  | "workflow_started"
  | "workflow_completed"
  | "workflow_failed"
  | "workflow_cancelled"
  | "activity_scheduled"
  | "activity_started"
  | "activity_completed"
  | "activity_failed"
  | "timer_fired"
  | "timer_cancelled"
  | "signal_received"
  | "compensation_started"
  | "compensation_completed";

interface WorkflowHistoryEventBase {
  readonly id: string;
  readonly type: WorkflowHistoryEventType;
  readonly timestamp: number;
  readonly sequenceNumber: number;
}

export interface WorkflowStartedEvent extends WorkflowHistoryEventBase {
  readonly type: "workflow_started";
  readonly workflowId: WorkflowId;
  readonly executionId: ExecutionId;
  readonly input: JsonValue;
}

export interface WorkflowCompletedEvent extends WorkflowHistoryEventBase {
  readonly type: "workflow_completed";
  readonly output: JsonValue;
}

export interface WorkflowFailedEvent extends WorkflowHistoryEventBase {
  readonly type: "workflow_failed";
  readonly error: string;
}

export interface WorkflowCancelledEvent extends WorkflowHistoryEventBase {
  readonly type: "workflow_cancelled";
  readonly reason: string;
}

export interface ActivityScheduledEvent extends WorkflowHistoryEventBase {
  readonly type: "activity_scheduled";
  readonly activityId: ActivityId;
  readonly activityType: string;
  readonly input: JsonValue;
}

export interface ActivityStartedEvent extends WorkflowHistoryEventBase {
  readonly type: "activity_started";
  readonly activityId: ActivityId;
  readonly attempt: number;
}

export interface ActivityCompletedEvent extends WorkflowHistoryEventBase {
  readonly type: "activity_completed";
  readonly activityId: ActivityId;
  readonly output: JsonValue;
}

export interface ActivityFailedEvent extends WorkflowHistoryEventBase {
  readonly type: "activity_failed";
  readonly activityId: ActivityId;
  readonly error: string;
  readonly attempt: number;
  readonly willRetry: boolean;
}

export interface TimerFiredEvent extends WorkflowHistoryEventBase {
  readonly type: "timer_fired";
  readonly timerId: TimerId;
}

export interface TimerCancelledEvent extends WorkflowHistoryEventBase {
  readonly type: "timer_cancelled";
  readonly timerId: TimerId;
}

export interface SignalReceivedEvent extends WorkflowHistoryEventBase {
  readonly type: "signal_received";
  readonly signalId: SignalId;
  readonly signalName: string;
  readonly payload: JsonValue;
}

export interface CompensationStartedEvent extends WorkflowHistoryEventBase {
  readonly type: "compensation_started";
  readonly reason: string;
}

export interface CompensationCompletedEvent extends WorkflowHistoryEventBase {
  readonly type: "compensation_completed";
  readonly success: boolean;
}

export type WorkflowHistoryEvent =
  | WorkflowStartedEvent
  | WorkflowCompletedEvent
  | WorkflowFailedEvent
  | WorkflowCancelledEvent
  | ActivityScheduledEvent
  | ActivityStartedEvent
  | ActivityCompletedEvent
  | ActivityFailedEvent
  | TimerFiredEvent
  | TimerCancelledEvent
  | SignalReceivedEvent
  | CompensationStartedEvent
  | CompensationCompletedEvent;

export interface WorkflowHistory {
  readonly executionId: ExecutionId;
  readonly events: readonly WorkflowHistoryEvent[];
}

let _counter = 0;
function nextId(): string {
  return `evt_${++_counter}_${Date.now()}`;
}

export class MutableWorkflowHistory {
  private readonly _events: WorkflowHistoryEvent[] = [];
  private _seq = 0;

  constructor(readonly executionId: ExecutionId) {}

  append<T extends Omit<WorkflowHistoryEvent, "id" | "timestamp" | "sequenceNumber">>(
    event: T
  ): WorkflowHistoryEvent {
    const full = {
      ...event,
      id: nextId(),
      timestamp: Date.now(),
      sequenceNumber: this._seq++,
    } as unknown as WorkflowHistoryEvent;
    this._events.push(full);
    return full;
  }

  snapshot(): WorkflowHistory {
    return { executionId: this.executionId, events: [...this._events] };
  }

  get length(): number {
    return this._events.length;
  }

  getByType<T extends WorkflowHistoryEvent["type"]>(
    type: T
  ): Extract<WorkflowHistoryEvent, { type: T }>[] {
    return this._events.filter(
      (e): e is Extract<WorkflowHistoryEvent, { type: T }> => e.type === type
    );
  }
}
