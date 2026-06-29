// validate middleware: Zod schema-based request body/query/params validation.

import type { Request, Response, NextFunction } from "express";
import type { ZodTypeAny, z } from "zod";

type Location = "body" | "query" | "params";

/** Returns a middleware that validates req[location] against a Zod schema. */
export function validateSchema<S extends ZodTypeAny>(schema: S, location: Location = "body") {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[location]);
    if (!result.success) {
      res.status(422).json({
        success: false,
        data: null,
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed",
          details: result.error.flatten(),
        },
      });
      return;
    }
    // Replace the raw payload with the parsed (and coerced) value.
    (req as Request & { [key: string]: unknown })[location] = result.data as z.infer<S>;
    next();
  };
}
