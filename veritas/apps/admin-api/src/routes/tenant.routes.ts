// Tenant admin routes: CRUD + suspend/activate lifecycle actions.
import { Router } from "express";
import {
  listTenants,
  getTenant,
  createTenant,
  updateTenant,
  suspendTenant,
  activateTenant,
  deleteTenant,
} from "../controllers/tenant.controller.js";

export function tenantRouter(): Router {
  const router = Router();

  // List all tenants
  router.get("/", listTenants);

  // Get a single tenant by ID
  router.get("/:id", getTenant);

  // Create a new tenant
  router.post("/", createTenant);

  // Update tenant metadata/plan/status
  router.patch("/:id", updateTenant);

  // Lifecycle actions
  router.post("/:id/suspend", suspendTenant);
  router.post("/:id/activate", activateTenant);

  // Delete (hard delete) a tenant
  router.delete("/:id", deleteTenant);

  return router;
}
