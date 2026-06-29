// Zod request body/query/params validation middleware factory.

import type { Request, Response, NextFunction } from "express";
import type { ZodTypeAny, z } from "zod";
import { sendError } from "../http/responder.js";

export function validateBody<T extends ZodTypeAny>(schema: T) {
  return function bodyValidator(
    req: Request,
    res: Response,
    next: NextFunction,
  ): void {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const issues = result.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      }));
      sendError(res, 422, "VALIDATION_ERROR", "Request body validation failed", {
        issues,
      } as Record<string, unknown>);
      return;
    }
    (req as Request & { validatedBody?: z.infer<T> }).validatedBody = result.data as z.infer<T>;
    next();
  };
}

export function validateQuery<T extends ZodTypeAny>(schema: T) {
  return function queryValidator(
    req: Request,
    res: Response,
    next: NextFunction,
  ): void {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const issues = result.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      }));
      sendError(res, 422, "VALIDATION_ERROR", "Query parameter validation failed", {
        issues,
      } as Record<string, unknown>);
      return;
    }
    (req as Request & { validatedQuery?: z.infer<T> }).validatedQuery = result.data as z.infer<T>;
    next();
  };
}
