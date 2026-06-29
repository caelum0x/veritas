// auth middleware: authenticates requests using session tokens or API keys from @veritas/auth.

import type { Request, Response, NextFunction } from "express";
import { ApiKeyAuthenticator, type Principal } from "@veritas/auth";
import type { TokenService } from "../container.js";

/** Attach the authenticated principal to the Express request for downstream handlers. */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      principal?: Principal;
    }
  }
}

/** Builds an auth middleware that first tries bearer session token, then API key. */
export function buildAuthMiddleware(
  tokenService: TokenService,
  apiKeyAuthenticator: ApiKeyAuthenticator,
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers["authorization"] as string | undefined;
    if (authHeader === undefined) {
      res.status(401).json({ success: false, data: null, error: { code: "UNAUTHORIZED", message: "Missing Authorization header" } });
      return;
    }

    // Try session token (Bearer vtok.*)
    if (/^bearer vtok\./i.test(authHeader)) {
      const token = authHeader.slice(7).trim();
      const result = tokenService.verify(token);
      if (result.ok) {
        const { userId, organizationId, sessionId } = result.value;
        req.principal = {
          id: sessionId,
          kind: "session",
          userId: userId as unknown as Principal["userId"],
          orgId: organizationId,
          scopes: [],
          metadata: {},
        } as unknown as Principal;
        return next();
      }
    }

    // Try API key (Bearer veritas_sk_* or ApiKey veritas_sk_*)
    const authCtx = {
      authorizationHeader: authHeader,
      signatureHeader: req.headers["x-veritas-signature"] as string | undefined,
      timestampHeader: req.headers["x-veritas-timestamp"] as string | undefined,
      method: req.method,
      url: `${req.protocol}://${req.hostname}${req.originalUrl}`,
      body: "",
      remoteIp: req.ip,
    };

    const result = await apiKeyAuthenticator.authenticate(authCtx);
    if (result.ok) {
      req.principal = result.value;
      return next();
    }

    res.status(401).json({
      success: false,
      data: null,
      error: { code: "UNAUTHORIZED", message: result.error.message },
    });
  };
}

/** Middleware that requires an authenticated principal — returns 401 if absent. */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (req.principal === undefined) {
    res.status(401).json({ success: false, data: null, error: { code: "UNAUTHORIZED", message: "Authentication required" } });
    return;
  }
  next();
}
