// Wraps async Express route handlers so thrown errors propagate to next().
import type { Request, Response, NextFunction, RequestHandler } from "express";

type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

/** Wrap an async handler so any rejected promise calls next(err). */
export function asyncHandler(fn: AsyncRouteHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}
