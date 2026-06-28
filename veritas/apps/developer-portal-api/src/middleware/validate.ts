// Zod-based request validation middleware for body, query, and params.
import type { Request, Response, NextFunction, RequestHandler } from "express";
import type { ZodSchema, ZodError } from "zod";

function formatZodError(err: ZodError): Record<string, string[]> {
  const fields: Record<string, string[]> = {};
  for (const issue of err.issues) {
    const path = issue.path.join(".") || "_root";
    (fields[path] ??= []).push(issue.message);
  }
  return fields;
}

export function validateBody<T>(schema: ZodSchema<T>): RequestHandler {
  return function bodyValidation(req: Request, res: Response, next: NextFunction): void {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(422).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Request body validation failed",
          details: formatZodError(result.error),
        },
      });
      return;
    }
    (req as Record<string, unknown>)["validatedBody"] = result.data;
    next();
  };
}

export function validateQuery<T>(schema: ZodSchema<T>): RequestHandler {
  return function queryValidation(req: Request, res: Response, next: NextFunction): void {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      res.status(422).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Query parameter validation failed",
          details: formatZodError(result.error),
        },
      });
      return;
    }
    (req as Record<string, unknown>)["validatedQuery"] = result.data;
    next();
  };
}

export function validateParams<T>(schema: ZodSchema<T>): RequestHandler {
  return function paramsValidation(req: Request, res: Response, next: NextFunction): void {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      res.status(422).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Path parameter validation failed",
          details: formatZodError(result.error),
        },
      });
      return;
    }
    (req as Record<string, unknown>)["validatedParams"] = result.data;
    next();
  };
}
