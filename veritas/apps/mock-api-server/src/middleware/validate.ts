// Zod-based request body/query/params validation middleware factory.
import type { Request, Response, NextFunction, RequestHandler } from "express";
import type { ZodSchema } from "zod";
import { sendUnprocessable } from "../http/responder.js";

type Target = "body" | "query" | "params";

export function validate<T>(schema: ZodSchema<T>, target: Target = "body"): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      sendUnprocessable(res, "Validation failed", result.error.issues);
      return;
    }
    // Attach parsed value back so downstream handlers get the coerced type.
    (req as Record<string, unknown>)[target] = result.data;
    next();
  };
}
