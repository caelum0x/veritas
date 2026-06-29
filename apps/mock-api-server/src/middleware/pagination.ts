// Parses and validates pagination query params (page, limit) from incoming requests.
import type { Request, Response, NextFunction, RequestHandler } from "express";

export interface PaginationParams {
  readonly page: number;
  readonly limit: number;
}

declare global {
  // Augment Express Request with parsed pagination.
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      pagination?: PaginationParams;
    }
  }
}

export function paginationMiddleware(defaultLimit = 20, maxLimit = 100): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const rawPage = parseInt(String(req.query["page"] ?? "1"), 10);
    const rawLimit = parseInt(String(req.query["limit"] ?? String(defaultLimit)), 10);

    const page = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
    const limit =
      isNaN(rawLimit) || rawLimit < 1
        ? defaultLimit
        : rawLimit > maxLimit
          ? maxLimit
          : rawLimit;

    req.pagination = { page, limit };
    next();
  };
}
