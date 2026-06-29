// Parses page/limit/cursor query params and attaches a PageRequest to req.pagination.
import type { Request, Response, NextFunction, RequestHandler } from "express";
import { toPageRequest, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "@veritas/core";
import type { PageRequest } from "@veritas/core";
import { z } from "zod";

declare global {
  namespace Express {
    interface Request {
      pagination: PageRequest;
    }
  }
}

/** Middleware that normalises pagination query params and attaches them to the request. */
export function pagination(req: Request, _res: Response, next: NextFunction): void {
  const raw = req.query as Record<string, string | undefined>;
  const limit = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, parseInt(raw["limit"] ?? String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE),
  );
  const cursor = raw["cursor"] ?? undefined;
  req.pagination = toPageRequest({ limit, cursor });
  next();
}

/** Builds a middleware that validates the request against a Zod schema. */
export function validate<T extends z.ZodTypeAny>(schema: T): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse({
      query: req.query,
      params: req.params,
      body: req.body,
    });
    if (!parsed.success) {
      next(parsed.error);
      return;
    }
    (req as Request & { validated: unknown }).validated = parsed.data;
    next();
  };
}
