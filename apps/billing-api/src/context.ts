// Request-scoped context carrying principal and correlation IDs for billing-api.

import type { Request } from "express";
import type { Principal } from "@veritas/auth";

/** Alias for the platform Principal used within the billing API. */
export type BillingPrincipal = Principal;

export interface BillingRequestContext {
  readonly requestId: string;
  readonly traceId?: string;
  readonly principal?: Principal;
  readonly organizationId?: string;
  readonly userId?: string;
}

const CONTEXT_KEY = Symbol("billing.request.context");

export function setRequestContext(req: Request, ctx: BillingRequestContext): void {
  (req as unknown as Record<symbol, BillingRequestContext>)[CONTEXT_KEY] = ctx;
}

export function getRequestContext(req: Request): BillingRequestContext | undefined {
  return (req as unknown as Record<symbol, BillingRequestContext | undefined>)[CONTEXT_KEY];
}

export function requireRequestContext(req: Request): BillingRequestContext {
  const ctx = getRequestContext(req);
  if (!ctx) throw new Error("Request context not initialized");
  return ctx;
}

export function requireOrganizationId(req: Request): string {
  const ctx = requireRequestContext(req);
  if (!ctx.organizationId) throw new Error("Organization ID not available in request context");
  return ctx.organizationId;
}
