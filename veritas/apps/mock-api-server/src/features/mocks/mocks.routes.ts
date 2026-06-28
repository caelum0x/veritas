// Registers all /mocks and /scenarios routes on the given router.
import type { Router } from "express";
import type { Deps } from "../../container.js";
import { createMocksService } from "./mocks.service.js";
import { buildMocksController } from "./mocks.controller.js";

export function registerMocksRoutes(router: Router, deps: Deps): void {
  const service = createMocksService(deps);
  const ctrl = buildMocksController(service);

  // Mock CRUD
  router.post("/mocks", (req, res, next) => ctrl.createMock(req, res, next));
  router.get("/mocks", (req, res) => ctrl.listMocks(req, res));
  router.get("/mocks/:mockId", (req, res) => ctrl.getMock(req, res));
  router.patch("/mocks/:mockId", (req, res) => ctrl.updateMock(req, res));
  router.delete("/mocks/:mockId", (req, res) => ctrl.deleteMock(req, res));

  // Reset call counts across all mocks
  router.post("/mocks/_reset", (req, res) => ctrl.resetCounts(req, res));

  // Request resolution — proxy incoming requests through the registry
  router.post("/mocks/_resolve", (req, res) => ctrl.resolveRequest(req, res));

  // Scenario management
  router.post("/scenarios", (req, res) => ctrl.createScenario(req, res));
  router.get("/scenarios", (req, res) => ctrl.listScenarios(req, res));
  router.get("/scenarios/:scenarioId", (req, res) => ctrl.getScenario(req, res));
  router.post("/scenarios/:scenarioId/activate", (req, res) => ctrl.activateScenario(req, res));
  router.post("/scenarios/:scenarioId/deactivate", (req, res) => ctrl.deactivateScenario(req, res));
  router.put("/scenarios/:scenarioId/mocks/:mockId", (req, res) => ctrl.addMockToScenario(req, res));
  router.delete("/scenarios/:scenarioId/mocks/:mockId", (req, res) => ctrl.removeMockFromScenario(req, res));
}
