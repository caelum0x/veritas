// Registers query feature routes onto an Express router.
import { Router } from "express";
import type { Deps } from "../../container.js";
import { QueryService } from "./queries.service.js";
import { makeQueriesController } from "./queries.controller.js";

export function registerQueriesRoutes(router: Router, deps: Deps): void {
  const queryService = new QueryService({
    registry: deps.registry,
    logger: deps.logger,
  });

  const ctrl = makeQueriesController({ queryService });

  router.post("/queries/execute", (req, res, next) => {
    ctrl.runQuery(req, res).catch(next);
  });

  router.get("/queries/sources", ctrl.listSources);
}
