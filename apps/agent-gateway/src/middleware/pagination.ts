// Express middleware that parses and normalises page/limit query parameters.

import type { Request, Response, NextFunction } from "express";
import { z } from "zod";

const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export interface Pagination {
  readonly page: number;
  readonly limit: number;
  readonly offset: number;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      pagination?: Pagination;
    }
  }
}

/** Parse page and limit from query string and attach to req.pagination. */
export function paginationMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const result = PaginationSchema.safeParse(req.query);
  const { page, limit } = result.success
    ? result.data
    : { page: 1, limit: 20 };

  req.pagination = { page, limit, offset: (page - 1) * limit };
  next();
}
