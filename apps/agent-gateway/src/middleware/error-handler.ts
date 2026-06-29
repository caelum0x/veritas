// Express global error handler middleware — maps all thrown errors to Problem Details responses.

import type { Request, Response, NextFunction } from "express";
import { isAppError } from "@veritas/core";
import type { Logger } from "@veritas/observability";
import { isGatewayError } from "../errors.js";
import { toApiError } from "../http/api-error.js";

/** Build the global error handler bound to the provided logger. */
export function errorHandlerMiddleware(logger: Logger) {
  // Four-argument signature required by Express to identify as error handler.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return (err: unknown, req: Request, res: Response, _next: NextFunction): void => {
    const requestId = req.headers["x-request-id"] as string | undefined;

    if (isAppError(err) || isGatewayError(err)) {
      const appErr = err as { statusCode?: number; code?: string; message?: string };
      const status = appErr.statusCode ?? 500;

      if (status >= 500) {
        logger.error("http: handled app error", {
          code: appErr.code,
          message: appErr.message,
          requestId,
          status,
        });
      } else {
        logger.warn("http: client error", {
          code: appErr.code,
          message: appErr.message,
          requestId,
          status,
        });
      }

      const { body } = toApiError(err);
      res.status(status).json(body);
      return;
    }

    logger.error("http: unhandled error", {
      err,
      requestId,
      message: err instanceof Error ? err.message : String(err),
    });

    const { status, body } = toApiError(err);
    res.status(status).json(body);
  };
}
