// Middleware: parses and validates pagination query params (page, limit) onto req.pagination.

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
      pagination: Pagination;
    }
  }
}

export function paginationMiddleware(req: Request, res: Response, next: NextFunction): void {
  const result = PaginationSchema.safeParse(req.query);
  if (!result.success) {
    res.status(400).json({ success: false, error: "Invalid pagination parameters" });
    return;
  }
  const { page, limit } = result.data;
  req.pagination = { page, limit, offset: (page - 1) * limit };
  next();
}
