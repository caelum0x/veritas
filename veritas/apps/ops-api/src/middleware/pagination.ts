// Middleware: parses pagination query parameters and attaches them to the request.
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";

const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

/** Extended request carrying parsed pagination state. */
export interface PaginatedRequest extends Request {
  pagination: PaginationParams;
}

export function paginationMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const parsed = PaginationSchema.safeParse(req.query);
  const { page, limit } = parsed.success
    ? parsed.data
    : { page: 1, limit: 20 };

  (req as PaginatedRequest).pagination = {
    page,
    limit,
    offset: (page - 1) * limit,
  };

  next();
}
