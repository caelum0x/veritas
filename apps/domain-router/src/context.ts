// Request context helpers: typed context accessor for per-request metadata in async chains.
import {
  runWithContext,
  getContext,
  extendContext,
  type RequestContext,
} from "@veritas/observability";

export type { RequestContext };

export interface DomainRouterContext extends RequestContext {
  readonly requestId: string;
  readonly correlationId?: string;
  readonly userId?: string;
  readonly orgId?: string;
  readonly apiKeyId?: string;
}

export function runWithDomainRouterContext<T>(
  ctx: DomainRouterContext,
  fn: () => T,
): T {
  return runWithContext(ctx, fn);
}

export function getDomainRouterContext(): DomainRouterContext | undefined {
  return getContext() as DomainRouterContext | undefined;
}

export function extendDomainRouterContext(
  patch: Partial<DomainRouterContext>,
): DomainRouterContext {
  return extendContext(patch) as DomainRouterContext;
}
