// Express error-handling middleware: maps AppError / HttpError / ZodError to JSON responses.
import type { Request, Response, NextFunction, ErrorRequestHandler } from "express";
import { isAppError } from "@veritas/core";
import { ZodError } from "zod";
import { HttpError } from "../http/api-error.js";
import { sendError } from "../http/responder.js";

export const errorHandler: ErrorRequestHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (err instanceof HttpError) {
    sendError(res, err.statusCode, err.code, err.message, err.details);
    return;
  }

  if (isAppError(err)) {
    const http = HttpError.fromAppError(err);
    sendError(res, http.statusCode, http.code, http.message, (err as { details?: unknown }).details);
    return;
  }

  if (err instanceof ZodError) {
    sendError(res, 422, "VALIDATION", "Request validation failed", { issues: err.issues });
    return;
  }

  const message = err instanceof Error ? err.message : "Internal server error";
  sendError(res, 500, "INTERNAL", message);
};
