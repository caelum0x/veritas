// HTTP controller for the plans feature — validates, calls service, sends response.
import type { Request, Response } from "express";
import { sendOk, sendCreated, sendNoContent } from "../../http/responder.js";
import { HttpError } from "../../http/api-error.js";
import { asyncHandler } from "../../http/async-handler.js";
import type { PlansService } from "./plans.service.js";
import {
  listPlansQuerySchema,
  planIdParamsSchema,
  createPlanBodySchema,
  updatePlanBodySchema,
} from "./plans.schema.js";

/** Build bound route handlers for the plans feature. */
export function makePlansController(service: PlansService) {
  const list = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const parsed = listPlansQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new HttpError(422, "VALIDATION", "Invalid query parameters", parsed.error.issues);
    }
    const result = await service.list(parsed.data);
    if (!result.ok) throw HttpError.fromAppError(result.error);
    const { items, nextCursor, total } = result.value;
    res.status(200).json({ success: true, data: items, meta: { total, nextCursor } });
  });

  const getById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const parsed = planIdParamsSchema.safeParse(req.params);
    if (!parsed.success) {
      throw new HttpError(422, "VALIDATION", "Invalid plan id");
    }
    const result = await service.getById(parsed.data.id);
    if (!result.ok) throw HttpError.fromAppError(result.error);
    sendOk(res, result.value);
  });

  const create = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const parsed = createPlanBodySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(422, "VALIDATION", "Invalid request body", parsed.error.issues);
    }
    const result = await service.create(parsed.data);
    if (!result.ok) throw HttpError.fromAppError(result.error);
    sendCreated(res, result.value);
  });

  const update = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const paramsParsed = planIdParamsSchema.safeParse(req.params);
    if (!paramsParsed.success) {
      throw new HttpError(422, "VALIDATION", "Invalid plan id");
    }
    const bodyParsed = updatePlanBodySchema.safeParse(req.body);
    if (!bodyParsed.success) {
      throw new HttpError(422, "VALIDATION", "Invalid request body", bodyParsed.error.issues);
    }
    const result = await service.update(paramsParsed.data.id, bodyParsed.data);
    if (!result.ok) throw HttpError.fromAppError(result.error);
    sendOk(res, result.value);
  });

  const deactivate = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const parsed = planIdParamsSchema.safeParse(req.params);
    if (!parsed.success) {
      throw new HttpError(422, "VALIDATION", "Invalid plan id");
    }
    const result = await service.deactivate(parsed.data.id);
    if (!result.ok) throw HttpError.fromAppError(result.error);
    sendOk(res, result.value);
  });

  const remove = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const parsed = planIdParamsSchema.safeParse(req.params);
    if (!parsed.success) {
      throw new HttpError(422, "VALIDATION", "Invalid plan id");
    }
    const result = await service.delete(parsed.data.id);
    if (!result.ok) throw HttpError.fromAppError(result.error);
    sendNoContent(res);
  });

  return { list, getById, create, update, deactivate, remove };
}
