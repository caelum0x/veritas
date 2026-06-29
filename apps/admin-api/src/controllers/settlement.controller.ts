// Settlement admin controller — CRUD + status transitions for settlements
import type { Request, Response, NextFunction } from "express";
import { isOk, isErr, type Result } from "@veritas/core";
import { HttpError } from "../http/api-error.js";
import { sendOk, sendPage } from "../http/responder.js";
import type {
  ListSettlementsQuery,
  UpdateSettlementStatusBody,
} from "../validators/settlement.validator.js";

interface SettlementService {
  list(query: ListSettlementsQuery): Promise<unknown>;
  findById(id: string): Promise<unknown>;
  updateStatus(id: string, body: UpdateSettlementStatusBody): Promise<unknown>;
  exportCsv(query: ListSettlementsQuery): Promise<unknown>;
}

function getSettlementService(req: Request): SettlementService {
  const svc = (req as unknown as Record<string, unknown>)["settlementService"];
  if (!svc) throw new HttpError(503, "UNAVAILABLE", "SettlementService unavailable");
  return svc as SettlementService;
}

export async function listSettlements(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const svc = getSettlementService(req);
    const query = res.locals["validatedQuery"] as ListSettlementsQuery;
    const result = await svc.list(query);
    const res0 = result as Result<unknown, unknown>;
    if (isErr(res0)) {
      next(new HttpError(500, "INTERNAL", String(res0.error)));
      return;
    }
    sendPage(res, [res0.value], { nextCursor: null, hasMore: false });
  } catch (err) {
    next(err);
  }
}

export async function getSettlement(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const svc = getSettlementService(req);
    const { id } = req.params as { id: string };
    const result = await svc.findById(id);
    const res1 = result as Result<unknown, unknown>;
    if (isErr(res1)) {
      next(new HttpError(500, "INTERNAL", String(res1.error)));
      return;
    }
    sendOk(res, res1.value);
  } catch (err) {
    next(err);
  }
}

export async function updateSettlementStatus(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const svc = getSettlementService(req);
    const { id } = req.params as { id: string };
    const body = res.locals["validatedBody"] as UpdateSettlementStatusBody;
    const result = await svc.updateStatus(id, body);
    const res2 = result as Result<unknown, unknown>;
    if (isErr(res2)) {
      next(new HttpError(500, "INTERNAL", String(res2.error)));
      return;
    }
    sendOk(res, res2.value);
  } catch (err) {
    next(err);
  }
}

export async function exportSettlementsCsv(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const svc = getSettlementService(req);
    const query = res.locals["validatedQuery"] as ListSettlementsQuery;
    const result = await svc.exportCsv(query);
    const res3 = result as Result<unknown, unknown>;
    if (isErr(res3)) {
      next(new HttpError(500, "INTERNAL", String(res3.error)));
      return;
    }
    const csv = isOk(res3) ? res3.value : "";
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="settlements.csv"'
    );
    res.status(200).send(csv);
  } catch (err) {
    next(err);
  }
}
