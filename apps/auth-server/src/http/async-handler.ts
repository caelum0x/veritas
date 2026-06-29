// asyncHandler: wraps async Express route handlers so promise rejections are forwarded to next().

import type { Request, Response, NextFunction, RequestHandler } from "express";

type AsyncFn = (req: Request, res: Response, next: NextFunction) => Promise<void>;

/**
 * Wraps an async Express handler and pipes any rejected promise to `next(err)`
 * so the central error-handler middleware receives it.
 */
export function asyncHandler(fn: AsyncFn): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
