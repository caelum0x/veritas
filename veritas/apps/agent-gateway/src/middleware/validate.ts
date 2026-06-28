// Express middleware factory for Zod schema validation of request bodies and params.

import type { Request, Response, NextFunction } from "express";
import { type ZodTypeAny, type z } from "zod";
import { GatewayRequestError } from "../errors.js";

/** Validate req.body against a Zod schema; call next(GatewayRequestError) on failure. */
export function validateBody<S extends ZodTypeAny>(schema: S) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const detail = result.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ");
      return next(new GatewayRequestError(`Request body validation failed: ${detail}`));
    }
    (req as Request & { validated: z.infer<S> }).validated = result.data as z.infer<S>;
    next();
  };
}

/** Validate req.params against a Zod schema. */
export function validateParams<S extends ZodTypeAny>(schema: S) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      const detail = result.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ");
      return next(new GatewayRequestError(`Path parameter validation failed: ${detail}`));
    }
    next();
  };
}

/** Validate req.query against a Zod schema. */
export function validateQuery<S extends ZodTypeAny>(schema: S) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const detail = result.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ");
      return next(new GatewayRequestError(`Query parameter validation failed: ${detail}`));
    }
    next();
  };
}
