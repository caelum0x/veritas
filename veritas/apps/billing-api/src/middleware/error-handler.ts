// Express error-handling middleware mapping errors to RFC 7807 Problem Details.

import type { Request, Response, NextFunction } from "express";
import type { Logger } from "@veritas/observability";
import { isApiError } from "../http/api-error.js";
import { isBillingApiError, httpStatusForCode } from "../errors.js";
import { respondError } from "../http/responder.js";

function extractCode(e: unknown): { status: number; code: string; message: string } {
  if (isApiError(e)) {
    return { status: e.statusCode, code: e.code, message: e.message };
  }
  if (isBillingApiError(e)) {
    return { status: httpStatusForCode(e.code), code: e.code, message: e.message };
  }
  if (e instanceof Error) {
    const code = (e as { code?: string }).code ?? "INTERNAL";
    return { status: httpStatusForCode(code), code, message: e.message };
  }
  return { status: 500, code: "INTERNAL", message: "An unexpected error occurred" };
}

export function makeErrorHandler(logger: Logger) {
  return function errorHandler(
    raw: unknown,
    req: Request,
    res: Response,
    _next: NextFunction,
  ): void {
    const { status, code, message } = extractCode(raw);

    if (status >= 500) {
      logger.error("http.error", {
        method: req.method,
        path: req.path,
        statusCode: status,
        code,
        message,
        stack: raw instanceof Error ? raw.stack : undefined,
      });
    } else {
      logger.warn("http.client_error", {
        method: req.method,
        path: req.path,
        statusCode: status,
        code,
        message,
      });
    }

    respondError(res, status, code, message, req.path);
  };
}
