// Zod schema validation middleware factory for request body, params, and query.
import type { Request, Response, NextFunction } from "express";
import type { ZodSchema, ZodError } from "zod";
import { sendError } from "../http/responder.js";

function formatZodErrors(err: ZodError): Record<string, unknown> {
  return Object.fromEntries(
    err.errors.map((issue) => [issue.path.join("."), issue.message]),
  );
}

export function validateBody<T>(schema: ZodSchema<T>) {
  return function bodyValidator(
    req: Request,
    res: Response,
    next: NextFunction,
  ): void {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      sendError(res, 400, "VALIDATION_ERROR", result.error.message);
      return;
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return function queryValidator(
    req: Request,
    res: Response,
    next: NextFunction,
  ): void {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const details = formatZodErrors(result.error);
      res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid query parameters", details },
      });
      return;
    }
    (req as Request & { validatedQuery: T }).validatedQuery = result.data;
    next();
  };
}

export function validateParams<T>(schema: ZodSchema<T>) {
  return function paramsValidator(
    req: Request,
    res: Response,
    next: NextFunction,
  ): void {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      sendError(res, 400, "VALIDATION_ERROR", result.error.message);
      return;
    }
    next();
  };
}
