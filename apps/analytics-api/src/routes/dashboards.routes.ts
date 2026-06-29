// Mounts dashboard CRUD and widget sub-routes under /dashboards.
import { Router } from "express";
import type { makeDashboardsController } from "../controllers/dashboards.controller.js";
import { requireScope } from "../middleware/auth.js";

type DashboardsController = ReturnType<typeof makeDashboardsController>;

export function makeDashboardsRouter(ctrl: DashboardsController): Router {
  const router = Router();

  router.get("/", requireScope("reports:read"), (req, res) => ctrl.listDashboards(req, res));
  router.get("/:id", requireScope("reports:read"), (req, res) => ctrl.getDashboard(req, res));
  router.post("/", requireScope("reports:write"), (req, res) => ctrl.createDashboard(req, res));
  router.patch("/:id", requireScope("reports:write"), (req, res) => ctrl.updateDashboard(req, res));
  router.post("/:id/archive", requireScope("reports:write"), (req, res) => ctrl.archiveDashboard(req, res));
  router.delete("/:id", requireScope("reports:write"), (req, res) => ctrl.deleteDashboard(req, res));
  router.post("/:id/widgets", requireScope("reports:write"), (req, res) => ctrl.addWidget(req, res));

  return router;
}
