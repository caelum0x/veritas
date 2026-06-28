// Stream join: inner and left joins keyed by event key within a time window.
import { newId } from "@veritas/core";
import type { StreamEvent, JoinType } from "./types.js";
import { Stream } from "./stream.js";
import { JoinError } from "./errors.js";

export type JoinedEvent<L = unknown, R = unknown> = {
  readonly id: string;
  readonly timestamp: number;
  readonly left: StreamEvent<L>;
  readonly right: StreamEvent<R> | null;
};

export type JoinOptions = {
  readonly type?: JoinType;
  readonly windowMs: number; // tolerance for matching timestamps
};

type BufferedEvent<T> = { event: StreamEvent<T>; expiresAt: number };

export class StreamJoin<L = unknown, R = unknown> {
  private leftBuffer: Array<BufferedEvent<L>> = [];
  private rightBuffer: Array<BufferedEvent<R>> = [];
  private leftUnsub?: () => void;
  private rightUnsub?: () => void;
  readonly output: Stream<JoinedEvent<L, R>>;

  constructor(
    private readonly left: Stream<L>,
    private readonly right: Stream<R>,
    private readonly options: JoinOptions,
  ) {
    if (options.windowMs <= 0) throw new JoinError("windowMs must be > 0");
    this.output = new Stream<JoinedEvent<L, R>>();
  }

  start(): void {
    if (this.leftUnsub) return;
    this.leftUnsub = this.left.subscribe(async (event) => {
      const now = Date.now();
      this.evictExpired(now);
      const matched = this.findMatch(this.rightBuffer, event.key, now);
      if (matched || this.options.type === "left") {
        const joined: JoinedEvent<L, R> = {
          id: newId("join"),
          timestamp: now,
          left: event,
          right: matched ? matched.event : null,
        };
        await this.output.publish(joined);
      }
      this.leftBuffer = [...this.leftBuffer, { event, expiresAt: now + this.options.windowMs }];
    });

    this.rightUnsub = this.right.subscribe(async (event) => {
      const now = Date.now();
      this.evictExpired(now);
      // For inner join: also emit when right arrives and left already buffered
      if (this.options.type !== "left") {
        const matched = this.findMatch(this.leftBuffer, event.key, now);
        if (matched) {
          const joined: JoinedEvent<L, R> = {
            id: newId("join"),
            timestamp: now,
            left: matched.event,
            right: event,
          };
          await this.output.publish(joined);
        }
      }
      this.rightBuffer = [...this.rightBuffer, { event, expiresAt: now + this.options.windowMs }];
    });
  }

  stop(): void {
    this.leftUnsub?.();
    this.rightUnsub?.();
    this.leftUnsub = undefined;
    this.rightUnsub = undefined;
  }

  private findMatch<T>(
    buffer: ReadonlyArray<BufferedEvent<T>>,
    key: string | undefined,
    now: number,
  ): BufferedEvent<T> | undefined {
    if (key === undefined) return undefined;
    return buffer.find((b) => b.event.key === key && b.expiresAt > now);
  }

  private evictExpired(now: number): void {
    this.leftBuffer = this.leftBuffer.filter((b) => b.expiresAt > now);
    this.rightBuffer = this.rightBuffer.filter((b) => b.expiresAt > now);
  }
}

export function joinStreams<L, R>(
  left: Stream<L>,
  right: Stream<R>,
  options: JoinOptions,
): StreamJoin<L, R> {
  const join = new StreamJoin(left, right, options);
  join.start();
  return join;
}
