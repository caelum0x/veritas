// Express error-handler middleware — converts thrown errors to structured JSON.
import type { Request, Response, NextFunction } from "express";
import { isAppError } from "@veritas/core";
import type { Logger } from "@veritas/observability";
import { makeInternalError } from "../http/api-error.js";

export function errorHandlerMiddleware(logger: Logger) {
  // Express error handlers must have exactly 4 params.
  return (
    err: unknown,
    _req: Request,
    res: Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _next: NextFunction,
  ): void => {
    if (isAppError(err)) {
      logger.warn("App error", { code: err.code, message: err.message, status: err.statusCode });
      res.status(err.statusCode).json({
        success: false,
        data: null,
        error: { code: err.code, message: err.message },
      });
      return;
    }

    const message = err instanceof Error ? err.message : "Unexpected error";
    logger.error("Unhandled error", { error: message });
    res.status(500).json(makeInternalError());
  };
}
