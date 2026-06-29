// async-handler.ts: wraps async Express route handlers to forward rejected promises to next().
import type { Request, Response, NextFunction } from "express";

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

/**
 * Wraps an async Express handler so any thrown error or rejected promise is
 * forwarded to next() instead of crashing the process.
 */
export function asyncHandler(handler: AsyncHandler) {
  return (req: Request, res: Response, next: NextFunction): void => {
    handler(req, res, next).catch(next);
  };
}
