// Pagination query parsing middleware — extracts page/limit from query string.
import type { Request, Response, NextFunction, RequestHandler } from "express";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "@veritas/core";

export interface PaginationQuery {
  readonly page: number;
  readonly limit: number;
  readonly offset: number;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      pagination?: PaginationQuery;
    }
  }
}

export function paginationMiddleware(): RequestHandler {
  return function parsePagination(req: Request, _res: Response, next: NextFunction): void {
    const rawPage = parseInt(String(req.query["page"] ?? "1"), 10);
    const rawLimit = parseInt(String(req.query["limit"] ?? String(DEFAULT_PAGE_SIZE)), 10);

    const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
    const limit = Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(rawLimit, MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE;
    const offset = (page - 1) * limit;

    (req as unknown as Record<string, unknown>)["pagination"] = { page, limit, offset };
    next();
  };
}
