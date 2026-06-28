// Registers dashboard routes on the provided router using the Deps container.
import { Router } from "express";
import type { Deps } from "../../container.js";
import { DashboardsService } from "./dashboards.service.js";
import { DashboardsController } from "./dashboards.controller.js";

export function registerDashboardsRoutes(router: Router, deps: Deps): void {
  const service = new DashboardsService(deps);
  const controller = new DashboardsController(service);

  // List all dashboards for an org
  router.get("/", controller.listDashboards);

  // Get assembled analytics data for a dashboard
  router.get("/data", controller.getDashboardData);

  // Get a single dashboard by ID
  router.get("/:id", controller.getDashboard);

  // Create a new dashboard
  router.post("/", controller.createDashboard);

  // Update an existing dashboard
  router.patch("/:id", controller.updateDashboard);

  // Archive a dashboard (soft delete)
  router.post("/:id/archive", controller.archiveDashboard);

  // Permanently delete a dashboard
  router.delete("/:id", controller.deleteDashboard);
}
