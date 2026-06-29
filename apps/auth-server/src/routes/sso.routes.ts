// SSO routes — mounts IdP login initiation and callback endpoints.

import { Router } from "express";
import type { SsoController } from "../controllers/sso.controller.js";

export function createSsoRouter(controller: SsoController): Router {
  const router = Router();

  // GET /auth/sso/initiate?providerId=<id> — redirect user to the IdP login page
  router.get("/initiate", (req, res, next) => {
    controller.initiateLogin(req, res, next);
  });

  // GET /auth/sso/callback?providerId=<id> — handle OIDC/OAuth2 code callback from IdP
  router.get("/callback", (req, res, next) => {
    controller.handleCallback(req, res, next);
  });

  // POST /auth/sso/callback?providerId=<id> — handle SAML HTTP-POST binding callback
  router.post("/callback", (req, res, next) => {
    controller.handleCallback(req, res, next);
  });

  return router;
}
