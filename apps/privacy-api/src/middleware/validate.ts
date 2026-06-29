// Middleware factory: validates request body/query/params against a Zod schema.

import type { Request, Response, NextFunction } from "express";
import { type ZodSchema, ZodError } from "zod";
import { makeProblem } from "../http/problem.js";

type RequestPart = "body" | "query" | "params";

export function validate<T>(schema: ZodSchema<T>, part: RequestPart = "body") {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[part]);
    if (!result.success) {
      const detail = result.error.errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join("; ");
      const problem = makeProblem(400, "VALIDATION_ERROR", detail, req.path, {
        issues: result.error.errors,
      });
      res.status(400).json(problem);
      return;
    }
    (req as Request & { [key: string]: unknown })[part] = result.data;
    next();
  };
}
