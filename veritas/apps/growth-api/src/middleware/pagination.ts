// Pagination query-parameter parsing middleware.
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

declare module "express-serve-static-core" {
  interface Request {
    pagination: Pagination;
  }
}

export function paginationMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const parsed = PaginationSchema.safeParse(req.query);
  const { page, limit } = parsed.success ? parsed.data : { page: 1, limit: 20 };
  (req as Request & { pagination: Pagination }).pagination = {
    page,
    limit,
    offset: (page - 1) * limit,
  };
  next();
}
