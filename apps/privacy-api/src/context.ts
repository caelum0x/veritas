// Request context: per-request ambient data threaded through AsyncLocalStorage.

import { AsyncLocalStorage } from "async_hooks";
import type { Principal } from "@veritas/auth";

export interface RequestCtx {
  readonly requestId: string;
  readonly correlationId: string;
  readonly startedAt: number;
  readonly principal?: Principal;
}

const storage = new AsyncLocalStorage<RequestCtx>();

export function runWithRequestCtx<T>(ctx: RequestCtx, fn: () => T): T {
  return storage.run(ctx, fn);
}

export function getRequestCtx(): RequestCtx | undefined {
  return storage.getStore();
}

export function requireRequestCtx(): RequestCtx {
  const ctx = storage.getStore();
  if (!ctx) throw new Error("No RequestCtx available in this async context");
  return ctx;
}
