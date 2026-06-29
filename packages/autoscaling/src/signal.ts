// Scaling signal: represents a measured metric value used to drive autoscaling decisions.
import { z } from 'zod';
import { Brand, brand, IsoTimestamp } from '@veritas/core';

export type SignalId = Brand<string, 'SignalId'>;
export const signalId = (raw: string): SignalId => brand<string, 'SignalId'>(raw);

export const SignalKindSchema = z.enum([
  'cpu_utilization',
  'memory_utilization',
  'request_rate',
  'queue_depth',
  'latency_p99',
  'latency_p95',
  'error_rate',
  'active_connections',
  'custom',
]);
export type SignalKind = z.infer<typeof SignalKindSchema>;

export const SignalSchema = z.object({
  id: z.string(),
  kind: SignalKindSchema,
  value: z.number().finite(),
  unit: z.string(),
  source: z.string(),
  timestamp: z.string().datetime() as unknown as z.ZodType<IsoTimestamp>,
  labels: z.record(z.string()).default({}),
});
export type Signal = z.infer<typeof SignalSchema>;

export const CreateSignalSchema = SignalSchema.omit({ id: true });
export type CreateSignal = z.infer<typeof CreateSignalSchema>;

export interface SignalRepository {
  save(signal: Signal): Promise<void>;
  findLatest(kind: SignalKind, source: string): Promise<Signal | null>;
  findWindow(
    kind: SignalKind,
    source: string,
    from: IsoTimestamp,
    to: IsoTimestamp,
  ): Promise<readonly Signal[]>;
}

export class InMemorySignalRepository implements SignalRepository {
  private readonly store = new Map<string, Signal[]>();

  private key(kind: SignalKind, source: string): string {
    return `${kind}::${source}`;
  }

  async save(signal: Signal): Promise<void> {
    const k = this.key(signal.kind, signal.source);
    const list = this.store.get(k) ?? [];
    this.store.set(k, [...list, signal]);
  }

  async findLatest(kind: SignalKind, source: string): Promise<Signal | null> {
    const list = this.store.get(this.key(kind, source)) ?? [];
    if (list.length === 0) return null;
    return list[list.length - 1] ?? null;
  }

  async findWindow(
    kind: SignalKind,
    source: string,
    from: IsoTimestamp,
    to: IsoTimestamp,
  ): Promise<readonly Signal[]> {
    const list = this.store.get(this.key(kind, source)) ?? [];
    return list.filter(
      (s) => s.timestamp >= from && s.timestamp <= to,
    );
  }
}
