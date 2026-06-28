// Extension execution context — carries metadata and shared services for a single extension invocation.
import type { Logger } from "@veritas/core";
import { noopLogger } from "@veritas/core";
import type { ExtensionId, ExtensionMeta } from "./types.js";

/** Immutable context passed to every extension handler at invocation time. */
export interface ExtensionContext {
  readonly extensionId: ExtensionId;
  readonly meta: ExtensionMeta;
  readonly logger: Logger;
  readonly startedAt: number;
  /** Arbitrary key/value bag for handler-specific data (read-only view). */
  readonly data: Readonly<Record<string, unknown>>;
}

export interface ExtensionContextInit {
  readonly extensionId: ExtensionId;
  readonly meta: ExtensionMeta;
  readonly logger?: Logger;
  readonly data?: Record<string, unknown>;
}

/** Create an immutable ExtensionContext for a handler invocation. */
export function makeExtensionContext(init: ExtensionContextInit): ExtensionContext {
  return {
    extensionId: init.extensionId,
    meta: init.meta,
    logger: init.logger ?? noopLogger,
    startedAt: Date.now(),
    data: Object.freeze({ ...(init.data ?? {}) }),
  };
}

/** Return a new context with additional data merged in (immutable). */
export function withContextData(
  ctx: ExtensionContext,
  extra: Record<string, unknown>
): ExtensionContext {
  return {
    ...ctx,
    data: Object.freeze({ ...ctx.data, ...extra }),
  };
}
