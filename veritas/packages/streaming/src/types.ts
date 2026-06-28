// Shared types for the streaming module.
import { z } from "zod";

export const streamEventSchema = z.object({
  id: z.string(),
  timestamp: z.number(),
  key: z.string().optional(),
  payload: z.unknown(),
});

export type StreamEvent<T = unknown> = {
  readonly id: string;
  readonly timestamp: number;
  readonly key?: string;
  readonly payload: T;
};

export type StreamHandler<T = unknown> = (event: StreamEvent<T>) => Promise<void> | void;

export type WindowType = "tumbling" | "sliding";

export type WindowDef = {
  readonly type: WindowType;
  readonly sizeMs: number;
  readonly slideMs?: number; // only for sliding
};

export type AggregateKind = "count" | "sum" | "min" | "max" | "avg";

export type WindowResult<T = unknown> = {
  readonly windowStart: number;
  readonly windowEnd: number;
  readonly events: ReadonlyArray<StreamEvent<T>>;
};

export type JoinType = "inner" | "left";

export type JoinResult<L = unknown, R = unknown> = {
  readonly left: StreamEvent<L>;
  readonly right: StreamEvent<R> | null;
};

export type OperatorFn<In = unknown, Out = unknown> = (
  event: StreamEvent<In>
) => Promise<StreamEvent<Out> | null> | StreamEvent<Out> | null;

export type StreamStatus = "idle" | "running" | "paused" | "closed" | "error";

export type StreamMetrics = {
  readonly processed: number;
  readonly dropped: number;
  readonly errors: number;
  readonly lastEventAt: number | null;
};
