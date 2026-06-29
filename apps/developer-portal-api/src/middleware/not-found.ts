// 404 catch-all middleware — handles unmatched routes.
import type { Request, Response, NextFunction, RequestHandler } from "express";

export function notFoundMiddleware(): RequestHandler {
  return function notFound(req: Request, res: Response, _next: NextFunction): void {
    res.status(404).json({
      success: false,
      error: {
        code: "NOT_FOUND",
        message: `Route ${req.method} ${req.path} not found`,
      },
    });
  };
}
