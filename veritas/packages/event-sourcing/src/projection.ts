// Projection interface for building read models from stored domain events.
import type { StoredEvent } from "./domain-event.js";

export interface ProjectionPosition {
  readonly lastProcessedVersion: number;
  readonly lastProcessedEventId: string | null;
}

export const INITIAL_POSITION: ProjectionPosition = {
  lastProcessedVersion: 0,
  lastProcessedEventId: null,
};

export interface Projection<TState = unknown> {
  readonly name: string;
  readonly aggregateType: string;
  initialState(): TState;
  canHandle(eventType: string): boolean;
  apply(state: TState, event: StoredEvent<unknown>): TState;
}

export interface ProjectionStore {
  loadState<TState>(projectionName: string, aggregateId: string): Promise<TState | null>;
  saveState<TState>(
    projectionName: string,
    aggregateId: string,
    state: TState,
    position: ProjectionPosition
  ): Promise<void>;
  loadPosition(projectionName: string, aggregateId: string): Promise<ProjectionPosition>;
}

export class InMemoryProjectionStore implements ProjectionStore {
  private readonly states = new Map<string, unknown>();
  private readonly positions = new Map<string, ProjectionPosition>();

  private stateKey(projectionName: string, aggregateId: string): string {
    return `${projectionName}::state::${aggregateId}`;
  }

  private positionKey(projectionName: string, aggregateId: string): string {
    return `${projectionName}::pos::${aggregateId}`;
  }

  async loadState<TState>(
    projectionName: string,
    aggregateId: string
  ): Promise<TState | null> {
    const val = this.states.get(this.stateKey(projectionName, aggregateId));
    return val !== undefined ? (val as TState) : null;
  }

  async saveState<TState>(
    projectionName: string,
    aggregateId: string,
    state: TState,
    position: ProjectionPosition
  ): Promise<void> {
    this.states.set(this.stateKey(projectionName, aggregateId), state);
    this.positions.set(this.positionKey(projectionName, aggregateId), position);
  }

  async loadPosition(
    projectionName: string,
    aggregateId: string
  ): Promise<ProjectionPosition> {
    return (
      this.positions.get(this.positionKey(projectionName, aggregateId)) ??
      INITIAL_POSITION
    );
  }
}
