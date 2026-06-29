// Zod body/query/params validation middleware: validates and replaces req fields with parsed values.
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { ValidationError, zodIssuesToFieldIssues } from "@veritas/core";

export type ValidateTarget = "body" | "query" | "params";

export interface ValidateOptions {
  stripUnknown?: boolean;
}

export function validateBody<T extends z.ZodTypeAny>(schema: T, _options: ValidateOptions = {}) {
  return function validateBodyMiddleware(req: Request, _res: Response, next: NextFunction): void {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(new ValidationError({ message: "Request body validation failed", issues: zodIssuesToFieldIssues(result.error) }));
      return;
    }
    (req as Request & { body: unknown }).body = result.data as unknown;
    next();
  };
}

export function validateQuery<T extends z.ZodTypeAny>(schema: T, _options: ValidateOptions = {}) {
  return function validateQueryMiddleware(req: Request, _res: Response, next: NextFunction): void {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      next(new ValidationError({ message: "Query parameter validation failed", issues: zodIssuesToFieldIssues(result.error) }));
      return;
    }
    (req as Request & { query: unknown }).query = result.data as Record<string, string>;
    next();
  };
}

export function validateParams<T extends z.ZodTypeAny>(schema: T) {
  return function validateParamsMiddleware(req: Request, _res: Response, next: NextFunction): void {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      next(new ValidationError({ message: "Route parameter validation failed", issues: zodIssuesToFieldIssues(result.error) }));
      return;
    }
    (req as Request & { params: unknown }).params = result.data as Record<string, string>;
    next();
  };
}

export function validate<
  TBody   extends z.ZodTypeAny = z.ZodUnknown,
  TQuery  extends z.ZodTypeAny = z.ZodUnknown,
  TParams extends z.ZodTypeAny = z.ZodUnknown,
>(schemas: { body?: TBody; query?: TQuery; params?: TParams }, _options: ValidateOptions = {}) {
  return function combinedValidateMiddleware(req: Request, _res: Response, next: NextFunction): void {
    if (schemas.params) {
      const r = schemas.params.safeParse(req.params);
      if (!r.success) { next(new ValidationError({ message: "Route parameter validation failed", issues: zodIssuesToFieldIssues(r.error) })); return; }
      (req as Request & { params: unknown }).params = r.data as Record<string, string>;
    }
    if (schemas.query) {
      const r = schemas.query.safeParse(req.query);
      if (!r.success) { next(new ValidationError({ message: "Query parameter validation failed", issues: zodIssuesToFieldIssues(r.error) })); return; }
      (req as Request & { query: unknown }).query = r.data as Record<string, string>;
    }
    if (schemas.body) {
      const r = schemas.body.safeParse(req.body);
      if (!r.success) { next(new ValidationError({ message: "Request body validation failed", issues: zodIssuesToFieldIssues(r.error) })); return; }
      (req as Request & { body: unknown }).body = r.data as unknown;
    }
    next();
  };
}
