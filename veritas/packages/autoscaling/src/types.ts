// Shared domain types for the autoscaling module used across sibling files.
import { IsoTimestamp } from '@veritas/core';
import { SignalKind } from './signal.js';

/** A normalized signal value consumed by policies and evaluators. */
export interface ScalingSignal {
  readonly kind: SignalKind;
  readonly value: number;
  readonly source: string;
  readonly timestamp: IsoTimestamp;
  readonly labels: Readonly<Record<string, string>>;
}

/** Result returned by a policy evaluation. */
export interface PolicyEvalResult {
  readonly desired: number;
  readonly reason: string;
}

/** A scaling policy that can evaluate signals and produce a desired capacity. */
export interface ScalingPolicy {
  readonly id: string;
  readonly name: string;
  readonly targetResource: string;
  readonly enabled: boolean;
  readonly priority: number;
  evaluate(
    signals: ReadonlyArray<ScalingSignal>,
    currentCapacity: number,
    nowMs?: number,
  ): PolicyEvalResult;
}

/** Describes a single resource that the autoscaler manages. */
export interface ManagedResource {
  readonly id: string;
  readonly name: string;
  readonly currentCapacity: number;
  readonly updatedAt: IsoTimestamp;
}

/** Port interface for a capacity backend (e.g. k8s, ECS, mock). */
export interface CapacityBackend {
  getCapacity(resourceId: string): Promise<number>;
  setCapacity(resourceId: string, desired: number): Promise<void>;
}

/** In-memory implementation of CapacityBackend for testing. */
export class InMemoryCapacityBackend implements CapacityBackend {
  private readonly store = new Map<string, number>();

  async getCapacity(resourceId: string): Promise<number> {
    return this.store.get(resourceId) ?? 0;
  }

  async setCapacity(resourceId: string, desired: number): Promise<void> {
    this.store.set(resourceId, desired);
  }
}
