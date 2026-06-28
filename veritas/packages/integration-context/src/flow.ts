// Flow<Input,Output> interface and helpers — framework-agnostic application service unit.

import type { Result } from "@veritas/core";
import type { IntegrationContext } from "./context.js";

/** A Flow is a single end-to-end use case composed from ordered steps. */
export interface Flow<Input, Output> {
  /** Execute the flow with the given input, returning a Result. */
  run(input: Input, ctx: IntegrationContext): Promise<Result<Output>>;
}

/** Metadata attached to a flow registration. */
export interface FlowMeta {
  readonly name: string;
  readonly description?: string;
}

/** A named flow wrapper carrying metadata alongside the implementation. */
export interface NamedFlow<Input, Output> extends Flow<Input, Output> {
  readonly meta: FlowMeta;
}

/** Wrap a plain run function as a named Flow. */
export function defineFlow<Input, Output>(
  meta: FlowMeta,
  run: (input: Input, ctx: IntegrationContext) => Promise<Result<Output>>
): NamedFlow<Input, Output> {
  return {
    meta: Object.freeze(meta),
    run,
  };
}

/** Execute a flow, logging start/end and elapsed time. */
export async function runFlow<Input, Output>(
  flow: Flow<Input, Output>,
  input: Input,
  ctx: IntegrationContext
): Promise<Result<Output>> {
  const name =
    "meta" in flow && typeof (flow as NamedFlow<Input, Output>).meta?.name === "string"
      ? (flow as NamedFlow<Input, Output>).meta.name
      : "unknown";
  const start = ctx.clock.now();
  ctx.logger.info("flow.start", { flow: name });
  const result = await flow.run(input, ctx);
  const elapsed = Date.now() - new Date(start).getTime();
  if ("ok" in result && result.ok) {
    ctx.logger.info("flow.ok", { flow: name, elapsedMs: elapsed });
  } else {
    ctx.logger.warn("flow.err", { flow: name, elapsedMs: elapsed });
  }
  return result;
}
