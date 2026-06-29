// BFF auth middleware: validates session token and attaches principal to context

import type { Context, Next } from "hono";
import { isOk } from "@veritas/core";
import type { Authenticator, Principal } from "@veritas/auth";
import type { Logger } from "@veritas/observability";
import { BffSessionError } from "../errors.js";

export interface BffAuthEnv {
  Variables: {
    principal: Principal;
  };
}

export interface AuthMiddlewareDeps {
  readonly authenticator: Authenticator;
  readonly logger: Logger;
}

/** Creates Hono middleware that authenticates the incoming BFF request. */
export function createAuthMiddleware(deps: AuthMiddlewareDeps) {
  return async (c: Context, next: Next): Promise<Response | void> => {
    const authorizationHeader = c.req.header("authorization");
    const signatureHeader = c.req.header("x-veritas-signature");
    const timestampHeader = c.req.header("x-veritas-timestamp");
    const remoteIp =
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
      c.req.header("x-real-ip");

    const body = await c.req.text();

    const result = await deps.authenticator.authenticate({
      authorizationHeader,
      signatureHeader,
      timestampHeader,
      method: c.req.method,
      url: c.req.url,
      body,
      remoteIp,
    });

    if (!isOk(result)) {
      deps.logger.warn("BFF auth failed", {
        error: result.error.message,
        path: c.req.path,
      });
      throw new BffSessionError(result.error.message);
    }

    c.set("principal", result.value as never);
    await next();
  };
}
