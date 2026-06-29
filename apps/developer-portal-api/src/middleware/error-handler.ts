// Express error handler middleware — maps AppError, ApiError and unknowns to JSON responses.
import type { Request, Response, NextFunction, ErrorRequestHandler } from "express";
import { isAppError } from "@veritas/core";
import type { Logger } from "@veritas/observability";
import { appErrorToHttpStatus } from "../errors.js";
import { ApiError } from "../http/api-error.js";

export function errorHandler(logger: Logger): ErrorRequestHandler {
  return (
    err: unknown,
    req: Request,
    res: Response,
    _next: NextFunction,
  ): void => {
    if (res.headersSent) return;

    if (err instanceof ApiError) {
      if (err.statusCode >= 500) {
        logger.error("ApiError", { status: err.statusCode, code: err.code, message: err.message });
      }
      res.status(err.statusCode).json({ success: false, error: err.toJSON() });
      return;
    }

    if (isAppError(err as Error)) {
      const appErr = err as { code: string; message: string };
      const status = appErrorToHttpStatus(appErr.code);
      if (status >= 500) {
        logger.error("AppError", { code: appErr.code, message: appErr.message, path: req.path });
      }
      res.status(status).json({
        success: false,
        error: { code: appErr.code, message: appErr.message },
      });
      return;
    }

    const message = err instanceof Error ? err.message : "Internal server error";
    logger.error("Unhandled error", { error: message, path: req.path });
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL", message: "Internal server error" },
    });
  };
}
