// Login routes — registers credential-based authentication endpoints on the router.

import type { Router } from "express";
import { LoginController } from "./login.controller.js";
import type { CredentialVerifier } from "./login.service.js";
import type { Logger } from "@veritas/observability";

export interface LoginDeps {
  readonly credentialVerifier: CredentialVerifier;
  readonly tokenConfig: { readonly secret: string; readonly ttlSeconds: number };
  readonly logger: Logger;
}

/**
 * Register login feature routes.
 * Mounts: POST /auth/login
 */
export function registerLoginRoutes(router: Router, deps: LoginDeps): void {
  const controller = new LoginController({
    credentialVerifier: deps.credentialVerifier,
    tokenConfig: deps.tokenConfig,
    logger: deps.logger,
  });

  // POST /auth/login — exchange email/password for a session token
  router.post("/auth/login", (req, res, next) => {
    controller.handleLogin(req, res, next);
  });
}
