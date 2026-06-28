// Express middleware that authenticates every request via @veritas/auth Authenticator.
import type { Request, Response, NextFunction } from "express";
import type { Authenticator, Principal } from "@veritas/auth";
import { isErr } from "@veritas/core";
import { sendApiError } from "../http/api-error.js";
import type { OpsRequest } from "../context.js";

export function makeAuthMiddleware(authenticator: Authenticator) {
  return async function authMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    // Skip auth for health and OpenAPI doc endpoints
    if (req.path === "/health" || req.path === "/livez" || req.path === "/openapi.json") {
      next();
      return;
    }

    const ctx = {
      authorizationHeader: req.headers["authorization"] as string | undefined,
      signatureHeader: req.headers["x-veritas-signature"] as string | undefined,
      timestampHeader: req.headers["x-veritas-timestamp"] as string | undefined,
      method: req.method,
      url: `${req.protocol}://${req.get("host") ?? "localhost"}${req.originalUrl}`,
      body: typeof req.body === "string" ? req.body : JSON.stringify(req.body ?? {}),
      remoteIp: req.ip,
    };

    const result = await authenticator.authenticate(ctx);
    if (isErr(result)) {
      sendApiError(res, 401, "UNAUTHORIZED", result.error.message);
      return;
    }

    (req as OpsRequest).principal = result.value;
    next();
  };
}
