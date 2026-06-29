// Parses and normalizes pagination query parameters from incoming requests.

import type { Request, Response, NextFunction } from "express";
import { z } from "zod";

const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(20),
  cursor: z.string().optional(),
});

export interface ParsedPagination {
  readonly page: number;
  readonly limit: number;
  readonly cursor?: string;
  readonly offset: number;
}

const PAGINATION_KEY = Symbol("billing.pagination");

export function paginationMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const result = PaginationQuerySchema.safeParse(req.query);
  const parsed = result.success ? result.data : { page: 1, limit: 20, cursor: undefined };
  const pagination: ParsedPagination = {
    page: parsed.page,
    limit: parsed.limit,
    cursor: parsed.cursor,
    offset: (parsed.page - 1) * parsed.limit,
  };
  (req as unknown as Record<symbol, ParsedPagination>)[PAGINATION_KEY] = pagination;
  next();
}

export function getPagination(req: Request): ParsedPagination {
  const p = (req as unknown as Record<symbol, ParsedPagination | undefined>)[PAGINATION_KEY];
  return p ?? { page: 1, limit: 20, cursor: undefined, offset: 0 };
}
