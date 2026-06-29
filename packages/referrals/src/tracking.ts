// tracking.ts: track referral clicks, signups, and conversion events.
import { Result, ok, err, newId } from "@veritas/core";

export type TrackingEventType = "click" | "signup" | "conversion" | "reward_issued";

export interface TrackingEvent {
  readonly id: string;
  readonly referralId?: string;
  readonly code: string;
  readonly eventType: TrackingEventType;
  readonly actorId?: string;
  readonly ip?: string;
  readonly userAgent?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly occurredAt: string;
}

export interface RecordEventInput {
  readonly referralId?: string;
  readonly code: string;
  readonly eventType: TrackingEventType;
  readonly actorId?: string;
  readonly ip?: string;
  readonly userAgent?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface TrackingStore {
  save(event: TrackingEvent): Promise<Result<TrackingEvent>>;
  findByCode(code: string): Promise<Result<readonly TrackingEvent[]>>;
  findByReferralId(referralId: string): Promise<Result<readonly TrackingEvent[]>>;
  countByType(code: string, eventType: TrackingEventType): Promise<Result<number>>;
}

export class InMemoryTrackingStore implements TrackingStore {
  private readonly events: TrackingEvent[] = [];

  async save(event: TrackingEvent): Promise<Result<TrackingEvent>> {
    this.events.push(event);
    return ok(event);
  }

  async findByCode(code: string): Promise<Result<readonly TrackingEvent[]>> {
    return ok(this.events.filter((e) => e.code === code));
  }

  async findByReferralId(referralId: string): Promise<Result<readonly TrackingEvent[]>> {
    return ok(this.events.filter((e) => e.referralId === referralId));
  }

  async countByType(code: string, eventType: TrackingEventType): Promise<Result<number>> {
    const count = this.events.filter((e) => e.code === code && e.eventType === eventType).length;
    return ok(count);
  }
}

export function makeTrackingEvent(input: RecordEventInput): TrackingEvent {
  return {
    id: newId("tracking"),
    referralId: input.referralId,
    code: input.code,
    eventType: input.eventType,
    actorId: input.actorId,
    ip: input.ip,
    userAgent: input.userAgent,
    metadata: input.metadata,
    occurredAt: new Date().toISOString(),
  };
}

export class Tracker {
  constructor(private readonly store: TrackingStore) {}

  async record(input: RecordEventInput): Promise<Result<TrackingEvent>> {
    const event = makeTrackingEvent(input);
    return this.store.save(event);
  }

  async getClickCount(code: string): Promise<Result<number>> {
    return this.store.countByType(code, "click");
  }

  async getConversionCount(code: string): Promise<Result<number>> {
    return this.store.countByType(code, "conversion");
  }

  async getEventsForReferral(referralId: string): Promise<Result<readonly TrackingEvent[]>> {
    return this.store.findByReferralId(referralId);
  }

  async getEventsForCode(code: string): Promise<Result<readonly TrackingEvent[]>> {
    return this.store.findByCode(code);
  }
}
