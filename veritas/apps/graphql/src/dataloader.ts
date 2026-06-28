// Minimal DataLoader implementation for batching and caching GraphQL field resolutions
import { InternalError } from "@veritas/core";

export type BatchLoadFn<K, V> = (keys: readonly K[]) => Promise<(V | Error)[]>;

export interface DataLoaderOptions {
  maxBatchSize?: number;
  cacheKeyFn?: (key: unknown) => string;
}

interface QueueItem<K, V> {
  key: K;
  resolve: (value: V) => void;
  reject: (err: unknown) => void;
}

export class DataLoader<K, V> {
  private readonly batchFn: BatchLoadFn<K, V>;
  private readonly maxBatchSize: number;
  private readonly cacheKeyFn: (key: unknown) => string;
  private readonly cache = new Map<string, Promise<V>>();
  private queue: QueueItem<K, V>[] = [];
  private scheduled = false;

  constructor(batchFn: BatchLoadFn<K, V>, options: DataLoaderOptions = {}) {
    this.batchFn = batchFn;
    this.maxBatchSize = options.maxBatchSize ?? 100;
    this.cacheKeyFn = options.cacheKeyFn ?? ((k) => String(k));
  }

  load(key: K): Promise<V> {
    const cacheKey = this.cacheKeyFn(key);
    const cached = this.cache.get(cacheKey);
    if (cached !== undefined) return cached;

    const promise = new Promise<V>((resolve, reject) => {
      this.queue.push({ key, resolve, reject });
      if (!this.scheduled) {
        this.scheduled = true;
        process.nextTick(() => this.dispatch());
      }
    });

    this.cache.set(cacheKey, promise);
    return promise;
  }

  loadMany(keys: readonly K[]): Promise<(V | Error)[]> {
    return Promise.all(
      keys.map((k) =>
        this.load(k).catch((err: unknown) =>
          err instanceof Error ? err : new Error(String(err))
        )
      )
    );
  }

  clear(key: K): this {
    this.cache.delete(this.cacheKeyFn(key));
    return this;
  }

  clearAll(): this {
    this.cache.clear();
    return this;
  }

  prime(key: K, value: V): this {
    const cacheKey = this.cacheKeyFn(key);
    if (!this.cache.has(cacheKey)) {
      this.cache.set(cacheKey, Promise.resolve(value));
    }
    return this;
  }

  private dispatch(): void {
    this.scheduled = false;
    const batch = this.queue.splice(0, this.maxBatchSize);
    if (batch.length === 0) return;

    if (this.queue.length > 0) {
      process.nextTick(() => this.dispatch());
    }

    const keys = batch.map((item) => item.key);

    this.batchFn(keys).then(
      (values) => {
        if (values.length !== keys.length) {
          const err = new InternalError({
            message: `DataLoader batch function returned ${values.length} values for ${keys.length} keys`,
          });
          batch.forEach((item) => item.reject(err));
          return;
        }
        batch.forEach((item, i) => {
          const value = values[i];
          if (value instanceof Error) {
            item.reject(value);
          } else {
            item.resolve(value as V);
          }
        });
      },
      (err: unknown) => {
        batch.forEach((item) => item.reject(err));
      }
    );
  }
}

export function createLoader<K, V>(
  batchFn: BatchLoadFn<K, V>,
  options?: DataLoaderOptions
): DataLoader<K, V> {
  return new DataLoader(batchFn, options);
}
