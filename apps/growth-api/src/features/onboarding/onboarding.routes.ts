// Registers onboarding flow and step HTTP routes on the given Express router.
import type { Router } from "express";
import type { Logger } from "@veritas/observability";
import { OnboardingService } from "./onboarding.service.js";
import { OnboardingController } from "./onboarding.controller.js";

/** Minimal slice of the Deps object required by this feature module. */
interface OnboardingDeps {
  readonly logger: Logger;
}

/** Register all onboarding routes; matches the registerXxxRoutes convention. */
export function registerOnboardingRoutes(router: Router, deps: OnboardingDeps): void {
  const service = new OnboardingService(deps.logger);
  const ctrl = new OnboardingController(service);

  // Flow lifecycle
  router.post("/", (req, res, next) => ctrl.createFlow(req, res, next));
  router.get("/", (req, res, next) => ctrl.listFlowsByUser(req, res, next));
  router.get("/:flowId", (req, res, next) => ctrl.getFlow(req, res, next));
  router.post("/:flowId/start", (req, res, next) => ctrl.startFlow(req, res, next));
  router.post("/:flowId/abandon", (req, res, next) => ctrl.abandonFlow(req, res, next));

  // Checklist
  router.get("/:flowId/checklist", (req, res, next) => ctrl.getChecklist(req, res, next));

  // Step management
  router.post("/:flowId/steps", (req, res, next) => ctrl.addStep(req, res, next));
  router.post("/:flowId/steps/:stepId/start", (req, res, next) => ctrl.startStep(req, res, next));
  router.post("/:flowId/steps/:stepId/complete", (req, res, next) => ctrl.completeStep(req, res, next));
  router.post("/:flowId/steps/:stepId/skip", (req, res, next) => ctrl.skipStep(req, res, next));
}
