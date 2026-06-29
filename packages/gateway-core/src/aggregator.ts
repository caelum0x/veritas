// Response aggregation: fans out to multiple upstreams and merges results.
import { mapWithConcurrency, type JsonValue } from "@veritas/core";

export interface AggregatorTarget {
  readonly key: string;
  readonly fetch: () => Promise<AggregatorResponse>;
}

export interface AggregatorResponse {
  readonly status: number;
  readonly body: JsonValue;
  readonly headers: Readonly<Record<string, string>>;
}

export interface AggregatedResponse {
  readonly results: Readonly<Record<string, AggregatorResponse>>;
  readonly errors: Readonly<Record<string, string>>;
  readonly mergedStatus: number;
}

export type MergeStrategy = "first-wins" | "all" | "custom";

export interface AggregatorOptions {
  readonly concurrency: number;
  readonly strategy: MergeStrategy;
  readonly timeoutMs?: number;
}

const DEFAULT_OPTIONS: AggregatorOptions = {
  concurrency: 4,
  strategy: "all",
};

async function fetchWithTimeout(
  target: AggregatorTarget,
  timeoutMs: number | undefined,
): Promise<{ key: string; result: AggregatorResponse | null; error: string | null }> {
  try {
    const fetchPromise = target.fetch();
    const result = timeoutMs !== undefined
      ? await Promise.race([
          fetchPromise,
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("timeout")), timeoutMs),
          ),
        ])
      : await fetchPromise;
    return { key: target.key, result, error: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { key: target.key, result: null, error: message };
  }
}

export async function aggregate(
  targets: ReadonlyArray<AggregatorTarget>,
  options: AggregatorOptions = DEFAULT_OPTIONS,
): Promise<AggregatedResponse> {
  const settled = await mapWithConcurrency(
    targets,
    options.concurrency,
    (t: AggregatorTarget) => fetchWithTimeout(t, options.timeoutMs),
  );

  const results: Record<string, AggregatorResponse> = {};
  const errors: Record<string, string> = {};

  for (const entry of settled) {
    if (entry.result !== null) {
      results[entry.key] = entry.result;
    } else if (entry.error !== null) {
      errors[entry.key] = entry.error;
    }
  }

  const statuses = Object.values(results).map((r) => r.status);
  const mergedStatus = statuses.length > 0
    ? statuses.some((s) => s >= 500) ? 502 : statuses.some((s) => s >= 400) ? 207 : 200
    : 502;

  return { results, errors, mergedStatus };
}
