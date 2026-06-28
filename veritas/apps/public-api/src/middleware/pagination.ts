// pagination.ts: extracts and normalizes cursor-based pagination query params.
import type { Request, Response, NextFunction } from "express";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "@veritas/core";

export interface PaginationParams {
  readonly cursor?: string;
  readonly limit: number;
}

declare module "express" {
  interface Request {
    pagination?: PaginationParams;
  }
}

/** Parse and attach cursor/limit pagination params from the request query string. */
export function paginationMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const rawCursor = req.query["cursor"];
  const rawLimit = req.query["limit"];

  const cursor = typeof rawCursor === "string" && rawCursor.length > 0
    ? rawCursor
    : undefined;

  const parsedLimit = typeof rawLimit === "string" ? parseInt(rawLimit, 10) : NaN;
  const limit = isNaN(parsedLimit) || parsedLimit < 1
    ? DEFAULT_PAGE_SIZE
    : Math.min(parsedLimit, MAX_PAGE_SIZE);

  req.pagination = { cursor, limit };
  next();
}
