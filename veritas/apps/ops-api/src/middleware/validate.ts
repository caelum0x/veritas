// Middleware factory: validates request body/query/params against a Zod schema.
import type { Request, Response, NextFunction, RequestHandler } from "express";
import { type ZodTypeAny, z } from "zod";
import { sendApiError } from "../http/api-error.js";

type Target = "body" | "query" | "params";

/** Returns a middleware that validates req[target] against schema, replaces it with parsed output. */
export function validate<T extends ZodTypeAny>(
  schema: T,
  target: Target = "body",
): RequestHandler {
  return function validateMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ): void {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      const issues = result.error.issues.map((i) => ({
        field: i.path.join("."),
        message: i.message,
      }));
      sendApiError(res, 422, "VALIDATION_ERROR", "Request validation failed", {
        fields: issues,
      });
      return;
    }
    (req as Record<string, unknown>)[target] = result.data;
    next();
  };
}

/** Convenience: validates query parameters. */
export function validateQuery<T extends ZodTypeAny>(schema: T): RequestHandler {
  return validate(schema, "query");
}

/** Convenience: validates route parameters. */
export function validateParams<T extends ZodTypeAny>(schema: T): RequestHandler {
  return validate(schema, "params");
}
