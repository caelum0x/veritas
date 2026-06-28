// SSO routes — registers IdP login initiation and callback endpoints on the router.

import type { Router } from "express";
import { SsoController } from "./sso.controller.js";
import type { UserProvisionPort, SsoServiceDeps, TokenConfig } from "./sso.service.js";
import type { ProviderRegistry, StateStore } from "@veritas/sso";
import type { Logger } from "@veritas/observability";

export interface SsoDeps {
  readonly providerRegistry: ProviderRegistry;
  readonly stateStore: StateStore;
  readonly userProvisionPort: UserProvisionPort;
  readonly tokenConfig: TokenConfig;
  readonly logger: Logger;
}

/**
 * Register SSO feature routes.
 * Mounts:
 *   GET  /auth/sso/providers          — list registered providers
 *   GET  /auth/sso/initiate           — redirect user to IdP
 *   GET  /auth/sso/callback/:providerId — OIDC/OAuth2 code callback
 *   POST /auth/sso/callback/:providerId — SAML HTTP-POST binding callback
 */
export function registerSsoRoutes(router: Router, deps: SsoDeps): void {
  const serviceDeps: SsoServiceDeps = {
    providerRegistry: deps.providerRegistry,
    stateStore: deps.stateStore,
    userProvisionPort: deps.userProvisionPort,
    tokenConfig: deps.tokenConfig,
    logger: deps.logger,
  };

  const controller = new SsoController(serviceDeps);

  router.get("/auth/sso/providers", (req, res) => {
    controller.listProviders(req, res);
  });

  router.get("/auth/sso/initiate", (req, res, next) => {
    controller.initiate(req, res, next);
  });

  router.get("/auth/sso/callback/:providerId", (req, res, next) => {
    controller.callback(req, res, next);
  });

  router.post("/auth/sso/callback/:providerId", (req, res, next) => {
    controller.callback(req, res, next);
  });

  // Fallback: providerId as query param for providers that don't support path params
  router.get("/auth/sso/callback", (req, res, next) => {
    controller.callback(req, res, next);
  });

  router.post("/auth/sso/callback", (req, res, next) => {
    controller.callback(req, res, next);
  });
}
