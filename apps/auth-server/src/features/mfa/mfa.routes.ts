// MFA routes — mounts TOTP enrollment, challenge issuance, verification, and status endpoints.

import { Router } from "express";
import type { Deps } from "../../container.js";
import { MfaService } from "./mfa.service.js";
import { MfaController } from "./mfa.controller.js";

export function registerMfaRoutes(router: Router, deps: Deps): void {
  const service = new MfaService({
    factorRepository: deps.factorRepository,
    challengeRepository: deps.challengeRepository,
    policyRepository: deps.policyRepository,
    logger: deps.logger,
  });
  const controller = new MfaController(service);

  // TOTP enrollment: returns factor ID, secret, and otpauth URI
  router.post("/mfa/enroll/totp", controller.enrollTotp);

  // List enrolled factors for a user
  router.get("/mfa/factors", controller.listFactors);

  // Delete a specific factor
  router.delete("/mfa/factors/:factorId", controller.deleteFactor);

  // Issue an authentication challenge for an enrolled factor
  router.post("/mfa/challenge", controller.issueChallenge);

  // Verify an active challenge
  router.post("/mfa/verify", controller.verify);

  // Get enrollment status summary for a user
  router.get("/mfa/status", controller.enrollmentStatus);
}
