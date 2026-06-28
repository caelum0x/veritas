// Zod-based request validation middleware factory.
import type { Request, Response, NextFunction, RequestHandler } from "express";
import { z } from "zod";

declare global {
  namespace Express {
    interface Request {
      validated?: unknown;
    }
  }
}

/** Build a middleware that validates req.body/query/params against a Zod schema. */
export function validateRequest<T extends z.ZodTypeAny>(
  schema: T,
  target: "body" | "query" | "params" | "all" = "body",
): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const input =
      target === "all"
        ? { body: req.body, query: req.query, params: req.params }
        : req[target];

    const result = schema.safeParse(input);
    if (!result.success) {
      next(result.error);
      return;
    }
    req.validated = result.data;
    next();
  };
}

/** Type-safe accessor for the validated data attached by validateRequest. */
export function getValidated<T>(req: Request): T {
  return req.validated as T;
}
