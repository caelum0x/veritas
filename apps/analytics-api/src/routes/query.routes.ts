// Query routes: POST /execute to run an ad-hoc analytics query, GET /sources to list data sources.
import { Router } from "express";
import { makeQueryController } from "../controllers/query.controller.js";
import type { AppDeps } from "../bootstrap.js";

export function queryRouter(deps: AppDeps): Router {
  const router = Router();
  const ctrl = makeQueryController({ registry: deps.registry });

  router.post("/execute", ctrl.runQuery);
  router.get("/sources", ctrl.listSources);

  return router;
}
