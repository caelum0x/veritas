// Wraps async Express route handlers so errors are passed to next().

import type { Request, Response, NextFunction, RequestHandler } from "express";

type AsyncRouteHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void>;

/** Wrap an async route handler and forward rejected promises to Express error middleware. */
export function asyncHandler(fn: AsyncRouteHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}
