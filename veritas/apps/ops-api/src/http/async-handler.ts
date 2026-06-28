// Wraps an async route handler and forwards any thrown errors to Express next().
import type { Request, Response, NextFunction, RequestHandler } from "express";

type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<void>;

/** Wrap an async Express handler so unhandled promise rejections are forwarded to the error handler. */
export function asyncHandler(fn: AsyncRequestHandler): RequestHandler {
  return function (req: Request, res: Response, next: NextFunction): void {
    fn(req, res, next).catch(next);
  };
}
