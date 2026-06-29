// Request-scoped context carrying principal identity and trace metadata.
import type { IsoTimestamp } from "@veritas/core";

/** The authenticated actor making a request. */
export interface Principal {
  readonly userId: string;
  readonly orgId: string | undefined;
  readonly roles: ReadonlyArray<string>;
  readonly apiKeyId: string | undefined;
}

/** Immutable request-scoped context threaded through service calls. */
export interface ServiceContext {
  readonly principal: Principal;
  readonly traceId: string;
  readonly requestId: string;
  readonly requestedAt: IsoTimestamp;
}

/** Create a new ServiceContext from parts. */
export function makeServiceContext(
  principal: Principal,
  traceId: string,
  requestId: string,
  requestedAt: IsoTimestamp,
): ServiceContext {
  return Object.freeze({ principal, traceId, requestId, requestedAt });
}

/** Derive a child context with a new traceId (e.g. for sub-calls). */
export function withTrace(ctx: ServiceContext, traceId: string): ServiceContext {
  return Object.freeze({ ...ctx, traceId });
}

/** Create a system-level context for background/internal jobs. */
export function systemContext(
  systemUserId: string,
  requestId: string,
  requestedAt: IsoTimestamp,
): ServiceContext {
  const principal: Principal = {
    userId: systemUserId,
    orgId: undefined,
    roles: ["system"],
    apiKeyId: undefined,
  };
  return makeServiceContext(principal, `system-${requestId}`, requestId, requestedAt);
}
