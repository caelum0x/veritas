// Pagination query parameter parser middleware for list endpoints.
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";

const PaginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export interface PaginationParams {
  readonly limit: number;
  readonly offset: number;
}

declare global {
  namespace Express {
    interface Request {
      pagination?: PaginationParams;
    }
  }
}

export function paginationMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const result = PaginationSchema.safeParse(req.query);
  if (!result.success) {
    res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid pagination parameters",
      },
    });
    return;
  }
  req.pagination = result.data;
  next();
}
