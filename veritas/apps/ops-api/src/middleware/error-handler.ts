// Express global error handler: maps domain and app errors to structured JSON responses.
import type { Request, Response, NextFunction } from "express";
import { isAppError } from "@veritas/core";
import { sendApiError } from "../http/api-error.js";
import { httpStatusFor } from "../errors.js";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (res.headersSent) return;

  if (isAppError(err)) {
    const status = httpStatusFor(err.code);
    sendApiError(res, status, err.code, err.message, err.details);
    return;
  }

  if (err instanceof Error && "code" in err) {
    const code = String((err as { code: unknown }).code);
    const status = httpStatusFor(code);
    if (status !== 500) {
      sendApiError(res, status, code, err.message);
      return;
    }
  }

  const message = err instanceof Error ? err.message : "An unexpected error occurred";
  sendApiError(res, 500, "INTERNAL_ERROR", message);
}
