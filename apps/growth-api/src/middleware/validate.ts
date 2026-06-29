// Zod schema validation helpers for Express request body, query, and params.
import type { Request, Response, NextFunction, RequestHandler } from "express";
import type { ZodTypeAny, z } from "zod";
import { buildProblem } from "../http/problem.js";

export function validateBody<S extends ZodTypeAny>(schema: S): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const problem = buildProblem(
        422,
        "VALIDATION_ERROR",
        "Request body validation failed",
        req.path,
        { issues: result.error.issues },
      );
      res.status(422).json(problem);
      return;
    }
    req.body = result.data as z.infer<S>;
    next();
  };
}

export function validateQuery<S extends ZodTypeAny>(schema: S): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const problem = buildProblem(
        400,
        "BAD_REQUEST",
        "Query parameter validation failed",
        req.path,
        { issues: result.error.issues },
      );
      res.status(400).json(problem);
      return;
    }
    (req as Request & { validatedQuery: unknown }).validatedQuery = result.data;
    next();
  };
}

export function validateParams<S extends ZodTypeAny>(schema: S): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      const problem = buildProblem(
        400,
        "BAD_REQUEST",
        "URL parameter validation failed",
        req.path,
        { issues: result.error.issues },
      );
      res.status(400).json(problem);
      return;
    }
    next();
  };
}
