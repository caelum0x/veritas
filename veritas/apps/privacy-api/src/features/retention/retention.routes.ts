// Registers retention routes on the provided Express router under /v1/retention.

import type { Router } from "express";
import type { Deps } from "../../container.js";
import { RetentionService } from "./retention.service.js";
import { RetentionController } from "./retention.controller.js";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../http/async-handler.js";

export function registerRetentionRoutes(router: Router, deps: Deps): void {
  const service = new RetentionService(deps);
  const ctrl = new RetentionController(service);

  // Retention policies
  router.get(
    "/v1/retention/policies",
    requireAuth,
    asyncHandler((req, res, next) => {
      ctrl.listPolicies(req, res, next);
      return Promise.resolve();
    }),
  );

  router.post(
    "/v1/retention/policies",
    requireAuth,
    asyncHandler((req, res, next) => {
      ctrl.createPolicy(req, res, next);
      return Promise.resolve();
    }),
  );

  router.get(
    "/v1/retention/policies/:id",
    requireAuth,
    asyncHandler((req, res, next) => {
      ctrl.getPolicy(req, res, next);
      return Promise.resolve();
    }),
  );

  router.patch(
    "/v1/retention/policies/:id",
    requireAuth,
    asyncHandler((req, res, next) => {
      ctrl.updatePolicy(req, res, next);
      return Promise.resolve();
    }),
  );

  router.delete(
    "/v1/retention/policies/:id",
    requireAuth,
    asyncHandler((req, res, next) => {
      ctrl.deletePolicy(req, res, next);
      return Promise.resolve();
    }),
  );

  // Legal holds
  router.get(
    "/v1/retention/legal-holds",
    requireAuth,
    asyncHandler((req, res, next) => {
      ctrl.listLegalHolds(req, res, next);
      return Promise.resolve();
    }),
  );

  router.post(
    "/v1/retention/legal-holds",
    requireAuth,
    asyncHandler((req, res, next) => {
      ctrl.createLegalHold(req, res, next);
      return Promise.resolve();
    }),
  );

  router.get(
    "/v1/retention/legal-holds/:id",
    requireAuth,
    asyncHandler((req, res, next) => {
      ctrl.getLegalHold(req, res, next);
      return Promise.resolve();
    }),
  );

  router.post(
    "/v1/retention/legal-holds/:id/release",
    requireAuth,
    asyncHandler((req, res, next) => {
      ctrl.releaseLegalHold(req, res, next);
      return Promise.resolve();
    }),
  );

  // Record expiry evaluation
  router.post(
    "/v1/retention/evaluate",
    requireAuth,
    asyncHandler((req, res, next) => {
      ctrl.evaluateRecords(req, res, next);
      return Promise.resolve();
    }),
  );

  // Audit log
  router.get(
    "/v1/retention/audit-log",
    requireAuth,
    asyncHandler((req, res, next) => {
      ctrl.getAuditLog(req, res, next);
      return Promise.resolve();
    }),
  );
}
