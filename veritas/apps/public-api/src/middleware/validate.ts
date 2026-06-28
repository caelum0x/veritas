// validate.ts: reusable zod-based request validation helpers for controllers.
import type { Request, Response, NextFunction } from "express";
import type { ZodSchema } from "zod";
import { ValidationError } from "@veritas/core";

/** Validate req.body against a Zod schema; calls next(ValidationError) on failure. */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const issues = result.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      }));
      next(new ValidationError({ message: "Request body validation failed", issues }));
      return;
    }
    (req as Record<string, unknown>)["validatedBody"] = result.data;
    next();
  };
}

/** Validate req.query against a Zod schema; calls next(ValidationError) on failure. */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const issues = result.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      }));
      next(new ValidationError({ message: "Query parameter validation failed", issues }));
      return;
    }
    (req as Record<string, unknown>)["validatedQuery"] = result.data;
    next();
  };
}

/** Retrieve the validated body attached by validateBody middleware. */
export function getValidatedBody<T>(req: Request): T {
  return (req as Record<string, unknown>)["validatedBody"] as T;
}

/** Retrieve the validated query attached by validateQuery middleware. */
export function getValidatedQuery<T>(req: Request): T {
  return (req as Record<string, unknown>)["validatedQuery"] as T;
}
