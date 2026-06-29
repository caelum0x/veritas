// Registers uptime and SLO evaluation routes on the provided Express router.
import type { Router } from "express";
import type { Deps } from "../../container.js";
import { isErr } from "@veritas/core";
import {
  getUptimeSummary,
  getComponentUptime,
  evaluateAndStoreSlo,
  listSloEvaluations,
  generateAndStoreSloReport,
  listSloReports,
  getSloErrorBudget,
} from "./uptime.service.js";
import {
  mapComponentUptime,
  mapSloEvaluationResult,
  mapSloReport,
  mapErrorBudget,
} from "./uptime.mapper.js";
import {
  GetSloEvaluationsQuerySchema,
  GetSloReportsQuerySchema,
} from "./uptime.schema.js";

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** Mount uptime and SLO evaluation endpoints on the router. */
export function registerUptimeRoutes(router: Router, deps: Deps): void {
  /** GET /uptime — overall uptime summary for all components. */
  router.get("/uptime", async (req, res, next) => {
    try {
      const result = await getUptimeSummary(deps);
      if (isErr(result)) {
        res.status(500).json({ success: false, error: { message: errMsg(result.error) } });
        return;
      }
      res.json({
        success: true,
        data: {
          components: result.value,
          generatedAt: new Date().toISOString(),
        },
      });
    } catch (cause) {
      next(cause);
    }
  });

  /** GET /uptime/:componentId — uptime windows for a single component. */
  router.get("/uptime/:componentId", async (req, res, next) => {
    try {
      const componentId = req.params["componentId"];
      if (!componentId) { res.status(400).json({ success: false, error: { message: "componentId required" } }); return; }
      const result = await getComponentUptime(deps, componentId);
      if (isErr(result)) {
        res.status(404).json({ success: false, error: { message: errMsg(result.error) } });
        return;
      }
      res.json({ success: true, data: result.value });
    } catch (cause) {
      next(cause);
    }
  });

  /** POST /slos/:id/evaluate — trigger an SLO evaluation. */
  router.post("/slos/:id/evaluate", async (req, res, next) => {
    try {
      const sloId = req.params["id"];
      if (!sloId) { res.status(400).json({ success: false, error: { message: "id required" } }); return; }
      const result = await evaluateAndStoreSlo(deps, sloId);
      if (isErr(result)) {
        res.status(404).json({ success: false, error: { message: errMsg(result.error) } });
        return;
      }
      res.status(201).json({ success: true, data: mapSloEvaluationResult(result.value) });
    } catch (cause) {
      next(cause);
    }
  });

  /** GET /slos/:id/evaluations — list evaluation results for an SLO. */
  router.get("/slos/:id/evaluations/history", async (req, res, next) => {
    try {
      const sloId = req.params["id"];
      if (!sloId) { res.status(400).json({ success: false, error: { message: "id required" } }); return; }
      const parsed = GetSloEvaluationsQuerySchema.safeParse(req.query);
      if (!parsed.success) { res.status(400).json({ success: false, error: { message: parsed.error.message } }); return; }
      const result = await listSloEvaluations(deps, sloId, parsed.data.limit);
      if (isErr(result)) {
        res.status(404).json({ success: false, error: { message: errMsg(result.error) } });
        return;
      }
      const items = result.value.map(mapSloEvaluationResult);
      res.json({ success: true, data: { items, total: items.length } });
    } catch (cause) {
      next(cause);
    }
  });

  /** POST /slos/:id/report — generate an SLO report. */
  router.post("/slos/:id/report", async (req, res, next) => {
    try {
      const sloId = req.params["id"];
      if (!sloId) { res.status(400).json({ success: false, error: { message: "id required" } }); return; }
      const parsed = GetSloReportsQuerySchema.safeParse(req.query);
      if (!parsed.success) { res.status(400).json({ success: false, error: { message: parsed.error.message } }); return; }
      const result = await generateAndStoreSloReport(deps, sloId, parsed.data.limit);
      if (isErr(result)) {
        res.status(404).json({ success: false, error: { message: errMsg(result.error) } });
        return;
      }
      res.status(201).json({ success: true, data: mapSloReport(result.value) });
    } catch (cause) {
      next(cause);
    }
  });

  /** GET /slos/:id/reports — list stored SLO reports. */
  router.get("/slos/:id/reports", async (req, res, next) => {
    try {
      const sloId = req.params["id"];
      if (!sloId) { res.status(400).json({ success: false, error: { message: "id required" } }); return; }
      const parsed = GetSloReportsQuerySchema.safeParse(req.query);
      if (!parsed.success) { res.status(400).json({ success: false, error: { message: parsed.error.message } }); return; }
      const result = await listSloReports(deps, sloId, parsed.data.limit);
      if (isErr(result)) {
        res.status(404).json({ success: false, error: { message: errMsg(result.error) } });
        return;
      }
      const items = result.value.map(mapSloReport);
      res.json({ success: true, data: { items, total: items.length } });
    } catch (cause) {
      next(cause);
    }
  });

  /** GET /slos/:id/error-budget — compute current error budget. */
  router.get("/slos/:id/error-budget", async (req, res, next) => {
    try {
      const sloId = req.params["id"];
      if (!sloId) { res.status(400).json({ success: false, error: { message: "id required" } }); return; }
      const result = await getSloErrorBudget(deps, sloId);
      if (isErr(result)) {
        res.status(404).json({ success: false, error: { message: errMsg(result.error) } });
        return;
      }
      res.json({ success: true, data: mapErrorBudget(result.value) });
    } catch (cause) {
      next(cause);
    }
  });
}
