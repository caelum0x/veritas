// Feature-flag admin routes: CRUD + enable/disable lifecycle actions.
import { Router } from "express";
import {
  listFeatureFlags,
  getFeatureFlag,
  createFeatureFlag,
  updateFeatureFlag,
  enableFeatureFlag,
  disableFeatureFlag,
  deleteFeatureFlag,
} from "../controllers/feature-flag.controller.js";

export function featureFlagRouter(): Router {
  const router = Router();

  // List all feature flags (filterable by tenantId, organizationId, enabled)
  router.get("/", listFeatureFlags);

  // Get a single feature flag by ID
  router.get("/:id", getFeatureFlag);

  // Create a new feature flag
  router.post("/", createFeatureFlag);

  // Update feature flag properties
  router.patch("/:id", updateFeatureFlag);

  // Lifecycle actions
  router.post("/:id/enable", enableFeatureFlag);
  router.post("/:id/disable", disableFeatureFlag);

  // Delete a feature flag
  router.delete("/:id", deleteFeatureFlag);

  return router;
}
