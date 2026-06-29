// asyncHandler: wraps an async Express route handler and forwards errors to next().
import type { Request, Response, NextFunction, RequestHandler } from "express";

type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

/** Wraps an async route handler so that rejected promises are forwarded to next(err). */
export function asyncHandler(fn: AsyncRequestHandler): RequestHandler {
  return function (req: Request, res: Response, next: NextFunction): void {
    fn(req, res, next).catch(next);
  };
}
