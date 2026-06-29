// Pagination middleware — parses and validates page/pageSize query parameters.
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";

const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(20),
});

export interface PaginationParams {
  readonly page: number;
  readonly pageSize: number;
}

declare module "express" {
  interface Request {
    pagination?: PaginationParams;
  }
}

/** Express middleware that parses page/pageSize from query and attaches req.pagination. */
export function paginationMiddleware(req: Request, res: Response, next: NextFunction): void {
  const result = PaginationSchema.safeParse({
    page: req.query["page"],
    pageSize: req.query["pageSize"] ?? req.query["page_size"],
  });

  if (!result.success) {
    res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid pagination parameters",
        issues: result.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      },
    });
    return;
  }

  req.pagination = result.data;
  next();
}
