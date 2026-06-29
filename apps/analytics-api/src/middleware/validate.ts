// Zod-based request validation middleware — validates body, query, and params.
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";

/** Middleware that validates req.body against a Zod schema; 422 on failure. */
export function validateBody<T extends z.ZodTypeAny>(schema: T) {
  return function bodyValidator(req: Request, res: Response, next: NextFunction): void {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const issues = result.error.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
      res.status(422).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Request body validation failed", issues } });
      return;
    }
    req.body = result.data as z.infer<T>;
    next();
  };
}

/** Middleware that validates req.query against a Zod schema; 400 on failure. */
export function validateQuery<T extends z.ZodTypeAny>(schema: T) {
  return function queryValidator(req: Request, res: Response, next: NextFunction): void {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const issues = result.error.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Query parameter validation failed", issues } });
      return;
    }
    (req as Request & { validatedQuery: z.infer<T> }).validatedQuery = result.data;
    next();
  };
}

/** Middleware that validates req.params against a Zod schema; 400 on failure. */
export function validateParams<T extends z.ZodTypeAny>(schema: T) {
  return function paramsValidator(req: Request, res: Response, next: NextFunction): void {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      const issues = result.error.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Path parameter validation failed", issues } });
      return;
    }
    next();
  };
}
