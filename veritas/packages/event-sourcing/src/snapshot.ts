// Snapshot store interface and snapshot policy for reducing event replay cost.
import type { IsoTimestamp } from "@veritas/core";
import { epochToIso } from "@veritas/core";

export interface Snapshot<TState = unknown> {
  readonly aggregateId: string;
  readonly aggregateType: string;
  readonly version: number;
  readonly state: TState;
  readonly takenAt: IsoTimestamp;
}

export interface SnapshotStore {
  save<TState>(snapshot: Snapshot<TState>): Promise<void>;
  load<TState>(
    aggregateId: string,
    aggregateType: string
  ): Promise<Snapshot<TState> | null>;
  delete(aggregateId: string, aggregateType: string): Promise<void>;
}

export interface SnapshotPolicy {
  shouldTakeSnapshot(currentVersion: number, lastSnapshotVersion: number): boolean;
}

export class EveryNEventsPolicy implements SnapshotPolicy {
  constructor(private readonly interval: number = 50) {}

  shouldTakeSnapshot(currentVersion: number, lastSnapshotVersion: number): boolean {
    return currentVersion - lastSnapshotVersion >= this.interval;
  }
}

export class NeverSnapshotPolicy implements SnapshotPolicy {
  shouldTakeSnapshot(_currentVersion: number, _lastSnapshotVersion: number): boolean {
    return false;
  }
}

export class InMemorySnapshotStore implements SnapshotStore {
  private readonly snapshots = new Map<string, Snapshot<unknown>>();

  private key(aggregateId: string, aggregateType: string): string {
    return `${aggregateType}:${aggregateId}`;
  }

  async save<TState>(snapshot: Snapshot<TState>): Promise<void> {
    this.snapshots.set(this.key(snapshot.aggregateId, snapshot.aggregateType), snapshot);
  }

  async load<TState>(
    aggregateId: string,
    aggregateType: string
  ): Promise<Snapshot<TState> | null> {
    const snap = this.snapshots.get(this.key(aggregateId, aggregateType));
    return snap ? (snap as Snapshot<TState>) : null;
  }

  async delete(aggregateId: string, aggregateType: string): Promise<void> {
    this.snapshots.delete(this.key(aggregateId, aggregateType));
  }
}

export function makeSnapshot<TState>(
  aggregateId: string,
  aggregateType: string,
  version: number,
  state: TState
): Snapshot<TState> {
  return {
    aggregateId,
    aggregateType,
    version,
    state,
    takenAt: epochToIso(Date.now()),
  };
}
