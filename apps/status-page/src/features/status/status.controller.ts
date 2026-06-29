// Status feature controller — validates requests, calls service, serialises responses.
import type { Request, Response, NextFunction } from "express";
import { isOk, isErr } from "@veritas/core";
import { z } from "zod";
import { getStatusPage, listSlos, getSlo, getSloEvaluations } from "./status.service.js";
import { mapStatusPagePayload, mapSlo, mapSloSummary } from "./status.mapper.js";
import type { StatusServiceDeps } from "./status.service.js";

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

const GetSloParamsSchema = z.object({ id: z.string().min(1) });

const GetSloEvaluationsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(20),
});

/** GET /api/status — full public status page payload. */
export async function handleGetStatus(
  deps: StatusServiceDeps,
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await getStatusPage(deps);
    if (isErr(result)) {
      res.status(503).json({ success: false, error: { message: errMsg(result.error) } });
      return;
    }
    res.json({ success: true, data: mapStatusPagePayload(result.value) });
  } catch (cause) {
    next(cause);
  }
}

/** GET /api/slos — list all SLOs. */
export async function handleListSlos(
  deps: StatusServiceDeps,
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await listSlos(deps);
    if (isErr(result)) {
      res.status(500).json({ success: false, error: { message: errMsg(result.error) } });
      return;
    }
    const items = result.value.map(mapSlo);
    res.json({ success: true, data: { items, total: items.length } });
  } catch (cause) {
    next(cause);
  }
}

/** GET /api/slos/:id — fetch a single SLO. */
export async function handleGetSlo(
  deps: StatusServiceDeps,
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = GetSloParamsSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: { message: parsed.error.message } });
      return;
    }
    const result = await getSlo(deps, parsed.data.id);
    if (isErr(result)) {
      res.status(404).json({ success: false, error: { message: errMsg(result.error) } });
      return;
    }
    res.json({ success: true, data: mapSlo(result.value) });
  } catch (cause) {
    next(cause);
  }
}

/** GET /api/slos/:id/evaluations — recent evaluation results for an SLO. */
export async function handleGetSloEvaluations(
  deps: StatusServiceDeps,
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const paramsParsed = GetSloParamsSchema.safeParse(req.params);
    if (!paramsParsed.success) {
      res.status(400).json({ success: false, error: { message: paramsParsed.error.message } });
      return;
    }
    const queryParsed = GetSloEvaluationsQuerySchema.safeParse(req.query);
    if (!queryParsed.success) {
      res.status(400).json({ success: false, error: { message: queryParsed.error.message } });
      return;
    }
    const result = await getSloEvaluations(deps, paramsParsed.data.id, queryParsed.data.limit);
    if (isErr(result)) {
      res.status(404).json({ success: false, error: { message: errMsg(result.error) } });
      return;
    }
    res.json({ success: true, data: { items: result.value, total: result.value.length } });
  } catch (cause) {
    next(cause);
  }
}
