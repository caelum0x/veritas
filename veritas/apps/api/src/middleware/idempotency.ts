// Idempotency-key middleware: caches responses keyed by Idempotency-Key header to prevent duplicate processing.
import type { Request, Response, NextFunction } from "express";
import { ConflictError } from "@veritas/core";
import {
  extractKeyFromHeaders,
  IDEMPOTENCY_KEY_HEADER,
} from "@veritas/idempotency";
import type { AuthenticatedRequest } from "./auth.js";

export interface IdempotencyRecord {
  status: number;
  headers: Record<string, string>;
  body: unknown;
  createdAt: number;
}

export interface IdempotencyStore {
  get(key: string): Promise<IdempotencyRecord | null>;
  set(key: string, record: IdempotencyRecord, ttlMs: number): Promise<void>;
  lock(key: string, ttlMs: number): Promise<boolean>;
  unlock(key: string): Promise<void>;
}

export class InMemoryIdempotencyStore implements IdempotencyStore {
  private readonly records = new Map<string, IdempotencyRecord>();
  private readonly locks   = new Set<string>();

  async get(key: string): Promise<IdempotencyRecord | null> { return this.records.get(key) ?? null; }
  async set(key: string, record: IdempotencyRecord, _ttlMs: number): Promise<void> { this.records.set(key, record); }
  async lock(key: string, _ttlMs: number): Promise<boolean> {
    if (this.locks.has(key)) return false;
    this.locks.add(key);
    return true;
  }
  async unlock(key: string): Promise<void> { this.locks.delete(key); }
}

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;
const LOCK_TTL_MS    = 30_000;

function buildStoreKey(req: Request): string {
  const authed = req as AuthenticatedRequest;
  const orgId  = authed.orgId ?? "anonymous";
  const key    = extractKeyFromHeaders(req.headers as Record<string, string | string[] | undefined>) ?? "";
  return `idempotency:${orgId}:${key}`;
}

export function createIdempotencyMiddleware(store: IdempotencyStore, ttlMs = DEFAULT_TTL_MS) {
  return async function idempotencyMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
    const idempotencyKey = extractKeyFromHeaders(req.headers as Record<string, string | string[] | undefined>);
    if (!idempotencyKey) { next(); return; }

    const storeKey = buildStoreKey(req);
    try {
      const existing = await store.get(storeKey);
      if (existing) {
        res.setHeader("Idempotency-Replay", "true");
        for (const [h, v] of Object.entries(existing.headers)) res.setHeader(h, v);
        res.status(existing.status).json(existing.body);
        return;
      }

      const locked = await store.lock(storeKey, LOCK_TTL_MS);
      if (!locked) {
        next(new ConflictError({ message: "Request with this idempotency key is already in progress" }));
        return;
      }

      const origJson   = res.json.bind(res);
      const origStatus = res.status.bind(res);
      let capturedStatus = 200;

      res.status = (code: number): Response => { capturedStatus = code; return origStatus(code); };
      res.json   = (body: unknown): Response => {
        const record: IdempotencyRecord = {
          status: capturedStatus,
          headers: { "content-type": (res.getHeader("content-type") as string | undefined) ?? "application/json" },
          body,
          createdAt: Date.now(),
        };
        void store.set(storeKey, record, ttlMs).then(() => store.unlock(storeKey));
        return origJson(body);
      };

      req.on("close", () => { void store.unlock(storeKey); });
      next();
    } catch (error) {
      next(error);
    }
  };
}
