// Reports routes: CRUD and template listing for analytical reports via @veritas/reporting.
import { Router } from "express";
import { makeReportsController } from "../controllers/reports.controller.js";
import type { AppDeps } from "../bootstrap.js";

export function reportsRouter(deps: AppDeps): Router {
  const router = Router();
  const ctrl = makeReportsController({
    reportStore: deps.reportStore,
    templateStore: deps.templateStore,
  });

  router.get("/", ctrl.listReports);
  router.get("/templates", ctrl.listTemplates);
  router.get("/:id", ctrl.getReport);
  router.post("/", ctrl.createReport);
  router.patch("/:id", ctrl.updateReport);
  router.delete("/:id", ctrl.deleteReport);

  return router;
}
