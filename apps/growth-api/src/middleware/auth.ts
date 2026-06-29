// Authentication middleware: validates API key via @veritas/auth and attaches principal to request.
import type { Request, Response, NextFunction } from "express";
import type { Authenticator, Principal } from "@veritas/auth";
import { isErr } from "@veritas/core";
import { buildProblem } from "../http/problem.js";

export const PRINCIPAL_KEY = "growthPrincipal";

export function getPrincipal(req: Request): Principal | undefined {
  return (req as unknown as Record<string, unknown>)[PRINCIPAL_KEY] as Principal | undefined;
}

export function makeAuthMiddleware(authenticator: Authenticator) {
  return async function authMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const result = await authenticator.authenticate({
      authorizationHeader: req.headers["authorization"],
      signatureHeader: req.headers["x-veritas-signature"] as string | undefined,
      timestampHeader: req.headers["x-veritas-timestamp"] as string | undefined,
      method: req.method,
      url: req.originalUrl,
      body: typeof req.body === "string" ? req.body : JSON.stringify(req.body ?? ""),
      remoteIp: req.ip,
    });

    if (isErr(result)) {
      const problem = buildProblem(401, "UNAUTHORIZED", "Authentication required", req.path);
      res.status(401).json(problem);
      return;
    }

    (req as unknown as Record<string, unknown>)[PRINCIPAL_KEY] = result.value;
    next();
  };
}
