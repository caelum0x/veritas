// pagination middleware: parses and attaches cursor-pagination params from query string.

import type { Request, Response, NextFunction } from "express";
import { z } from "zod";

const PaginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  cursor: z.string().min(1).optional(),
});

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      pagination?: PaginationQuery;
    }
  }
}

/** Parses `limit` and `cursor` query params and attaches them to req.pagination. */
export function paginationMiddleware(req: Request, res: Response, next: NextFunction): void {
  const result = PaginationQuerySchema.safeParse(req.query);
  if (!result.success) {
    res.status(422).json({
      success: false,
      data: null,
      error: { code: "INVALID_PAGINATION", message: "Invalid pagination parameters", details: result.error.flatten() },
    });
    return;
  }
  req.pagination = result.data;
  next();
}
