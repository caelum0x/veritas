// Login service — credential verification and session token issuance via @veritas/auth.

import { ok, err, isErr, type Result, UnauthorizedError, type AppError } from "@veritas/core";
import { generateToken, type SessionTokenPayload } from "@veritas/auth";
import type { Logger } from "@veritas/observability";
import type { LoginRequest, LoginResponse } from "./login.schema.js";
import { toLoginResponse } from "./login.mapper.js";

/** Port: verifies a user's email/password against a backing store. */
export interface CredentialVerifier {
  verify(
    email: string,
    password: string,
    orgId?: string,
  ): Promise<{ userId: string; organizationId: string; sessionId: string } | null>;
}

/** Minimal token-issuance config required by the service. */
export interface TokenConfig {
  readonly secret: string;
  readonly ttlSeconds: number;
}

export interface LoginServiceDeps {
  readonly credentialVerifier: CredentialVerifier;
  readonly tokenConfig: TokenConfig;
  readonly logger: Logger;
}

/** Verify credentials and issue a signed session token. */
export async function loginWithCredentials(
  req: LoginRequest,
  deps: LoginServiceDeps,
): Promise<Result<LoginResponse, AppError>> {
  const { credentialVerifier, tokenConfig, logger } = deps;

  logger.debug("login.attempt", { email: req.email, orgId: req.organizationId });

  let principal: { userId: string; organizationId: string; sessionId: string } | null;
  try {
    principal = await credentialVerifier.verify(req.email, req.password, req.organizationId);
  } catch (cause) {
    logger.error("login.verifier_error", { error: cause });
    return err(new UnauthorizedError({ message: "Authentication service unavailable" }));
  }

  if (principal === null) {
    logger.warn("login.invalid_credentials", { email: req.email });
    return err(new UnauthorizedError({ message: "Email or password is incorrect" }));
  }

  const expiresAt = Math.floor(Date.now() / 1000) + tokenConfig.ttlSeconds;
  const payload: SessionTokenPayload = {
    userId: principal.userId,
    organizationId: principal.organizationId,
    sessionId: principal.sessionId,
    expiresAt,
  };

  const token = generateToken(tokenConfig.secret, payload);

  logger.info("login.success", { userId: principal.userId, orgId: principal.organizationId });

  return ok(toLoginResponse(token, principal));
}

/** Refresh a token by re-issuing with the same principal identifiers. */
export function refreshToken(
  principal: Omit<SessionTokenPayload, "expiresAt">,
  config: TokenConfig,
): Result<string, AppError> {
  const expiresAt = Math.floor(Date.now() / 1000) + config.ttlSeconds;
  const token = generateToken(config.secret, { ...principal, expiresAt });
  return ok(token);
}
