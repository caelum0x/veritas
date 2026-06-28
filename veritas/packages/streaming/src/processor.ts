// Stream processor: transforms/filters events between an input and output stream.
import { newId } from "@veritas/core";
import type { StreamEvent } from "./types.js";
import { Stream } from "./stream.js";
import { ProcessorError } from "./errors.js";

export type TransformFn<In, Out> = (event: StreamEvent<In>) => StreamEvent<Out> | null | Promise<StreamEvent<Out> | null>;
export type FilterFn<T> = (event: StreamEvent<T>) => boolean | Promise<boolean>;

export type ProcessorOptions<In, Out> = {
  readonly transform?: TransformFn<In, Out>;
  readonly filter?: FilterFn<In>;
};

export class Processor<In = unknown, Out = unknown> {
  readonly id: string;
  private unsubscribe?: () => void;

  constructor(
    private readonly input: Stream<In>,
    private readonly output: Stream<Out>,
    private readonly options: ProcessorOptions<In, Out> = {},
  ) {
    this.id = newId("proc");
  }

  start(): void {
    if (this.unsubscribe) return;
    this.unsubscribe = this.input.subscribe(async (event) => {
      try {
        const { filter, transform } = this.options;
        if (filter) {
          const keep = await Promise.resolve(filter(event));
          if (!keep) return;
        }
        if (transform) {
          const out = await Promise.resolve(transform(event));
          if (out !== null && out !== undefined) {
            await this.output.publish(out.payload, out.key);
          }
        } else {
          // passthrough cast — only safe when In extends Out
          await this.output.publish(event.payload as unknown as Out, event.key);
        }
      } catch (cause) {
        throw new ProcessorError(this.id, "Handler failed", cause);
      }
    });
  }

  stop(): void {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
  }

  isRunning(): boolean {
    return this.unsubscribe !== undefined;
  }
}

export function createProcessor<In, Out>(
  input: Stream<In>,
  output: Stream<Out>,
  options?: ProcessorOptions<In, Out>,
): Processor<In, Out> {
  const p = new Processor(input, output, options);
  p.start();
  return p;
}
