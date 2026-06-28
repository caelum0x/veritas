// In-process token-bucket rate limiter middleware using @veritas/auth rate-limit key.
import type { Request, Response, NextFunction } from "express";
import { deriveRateLimitKey } from "@veritas/auth";
import { getPrincipal } from "./auth.js";
import { buildProblem } from "../http/problem.js";

interface BucketEntry {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, BucketEntry>();

function getOrCreate(key: string, windowMs: number): BucketEntry {
  const now = Date.now();
  const existing = buckets.get(key);
  if (existing !== undefined && now < existing.resetAt) return existing;
  const entry: BucketEntry = { count: 0, resetAt: now + windowMs };
  buckets.set(key, entry);
  return entry;
}

export function rateLimitMiddleware(windowMs: number, max: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const principal = getPrincipal(req);
    const key = deriveRateLimitKey(
      principal?.kind === "api_key" ? principal.id : undefined,
      req.ip ?? "unknown",
    );

    const bucket = getOrCreate(key, windowMs);
    bucket.count += 1;

    res.setHeader("X-RateLimit-Limit", String(max));
    res.setHeader("X-RateLimit-Remaining", String(Math.max(0, max - bucket.count)));
    res.setHeader("X-RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > max) {
      const problem = buildProblem(429, "RATE_LIMITED", "Too many requests", req.path);
      res.status(429).json(problem);
      return;
    }

    next();
  };
}
