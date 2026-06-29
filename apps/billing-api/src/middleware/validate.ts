// Zod-based request validation middleware factory for body, params, and query.

import type { Request, Response, NextFunction } from "express";
import { type ZodSchema, ZodError } from "zod";
import { respondError } from "../http/responder.js";

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const issues = formatZodError(result.error);
      respondError(res, 422, "VALIDATION", "Request body validation failed", req.path, { issues });
      return;
    }
    req.body = result.data;
    next();
  };
}

export function validateParams<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      const issues = formatZodError(result.error);
      respondError(res, 422, "VALIDATION", "Request params validation failed", req.path, { issues });
      return;
    }
    next();
  };
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const issues = formatZodError(result.error);
      respondError(res, 422, "VALIDATION", "Query parameter validation failed", req.path, { issues });
      return;
    }
    next();
  };
}

function formatZodError(error: ZodError): Array<{ path: string; message: string }> {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}
