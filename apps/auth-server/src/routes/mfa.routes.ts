// MFA routes: POST /mfa/challenge to issue a challenge, POST /mfa/verify to verify it.

import { Router } from "express";
import type { MfaController } from "../controllers/mfa.controller.js";

export function buildMfaRouter(controller: MfaController): Router {
  const router = Router();

  // Issue a new MFA challenge for the given userId + factorId
  router.post("/challenge", controller.issueChallenge);

  // Verify a pending MFA challenge with a TOTP/HOTP/WebAuthn/recovery payload
  router.post("/verify", controller.verify);

  return router;
}
