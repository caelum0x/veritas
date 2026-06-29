// Cooldown: prevents rapid successive scaling actions on the same resource.
import { IsoTimestamp, Clock, systemClock } from '@veritas/core';

/** Result of a cooldown check. */
export interface CooldownCheckResult {
  readonly allowed: boolean;
  readonly endsAtMs?: number;
}

/** Simple tracker interface used by the Evaluator for global cooldown state. */
export interface CooldownTracker {
  check(nowMs: number): CooldownCheckResult;
  arm(nowMs: number): void;
}

/** In-memory implementation of CooldownTracker with a configurable duration. */
export class InMemoryCooldownTracker implements CooldownTracker {
  private armedAtMs: number | null = null;

  constructor(private readonly durationMs: number = 60_000) {}

  check(nowMs: number): CooldownCheckResult {
    if (this.armedAtMs === null) return { allowed: true };
    const endsAtMs = this.armedAtMs + this.durationMs;
    if (nowMs >= endsAtMs) {
      this.armedAtMs = null;
      return { allowed: true };
    }
    return { allowed: false, endsAtMs };
  }

  arm(nowMs: number): void {
    this.armedAtMs = nowMs;
  }
}

export interface CooldownRecord {
  readonly resource: string;
  readonly direction: 'up' | 'down';
  readonly triggeredAt: IsoTimestamp;
  readonly cooldownSeconds: number;
}

export interface CooldownStore {
  get(resource: string, direction: 'up' | 'down'): Promise<CooldownRecord | null>;
  set(record: CooldownRecord): Promise<void>;
  clear(resource: string, direction: 'up' | 'down'): Promise<void>;
}

export class InMemoryCooldownStore implements CooldownStore {
  private readonly store = new Map<string, CooldownRecord>();

  private key(resource: string, direction: 'up' | 'down'): string {
    return `${resource}::${direction}`;
  }

  async get(resource: string, direction: 'up' | 'down'): Promise<CooldownRecord | null> {
    return this.store.get(this.key(resource, direction)) ?? null;
  }

  async set(record: CooldownRecord): Promise<void> {
    this.store.set(this.key(record.resource, record.direction), record);
  }

  async clear(resource: string, direction: 'up' | 'down'): Promise<void> {
    this.store.delete(this.key(resource, direction));
  }
}

export class CooldownManager {
  constructor(
    private readonly store: CooldownStore,
    private readonly clock: Clock = systemClock,
  ) {}

  async isActive(resource: string, direction: 'up' | 'down'): Promise<boolean> {
    const record = await this.store.get(resource, direction);
    if (record === null) return false;
    const elapsed =
      (this.clock.now() - new Date(record.triggeredAt).getTime()) / 1000;
    return elapsed < record.cooldownSeconds;
  }

  async record(
    resource: string,
    direction: 'up' | 'down',
    cooldownSeconds: number,
  ): Promise<void> {
    const triggeredAt = new Date(this.clock.now()).toISOString() as IsoTimestamp;
    await this.store.set({ resource, direction, triggeredAt, cooldownSeconds });
  }

  async remainingSeconds(
    resource: string,
    direction: 'up' | 'down',
  ): Promise<number> {
    const record = await this.store.get(resource, direction);
    if (record === null) return 0;
    const elapsed =
      (this.clock.now() - new Date(record.triggeredAt).getTime()) / 1000;
    return Math.max(0, record.cooldownSeconds - elapsed);
  }
}
