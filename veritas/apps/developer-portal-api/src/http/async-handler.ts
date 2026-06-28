// Wraps async Express route handlers to forward promise rejections to next().
import type { Request, Response, NextFunction, RequestHandler } from "express";

type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

export function asyncHandler(fn: AsyncRouteHandler): RequestHandler {
  return function asyncMiddleware(req: Request, res: Response, next: NextFunction): void {
    fn(req, res, next).catch(next);
  };
}
