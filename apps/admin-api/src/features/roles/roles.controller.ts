// HTTP controller for the roles feature — validates, calls service, sends response.
import type { Request, Response, NextFunction } from "express";
import { sendOk, sendCreated, sendNoContent } from "../../http/responder.js";
import { HttpError } from "../../http/api-error.js";
import { asyncHandler } from "../../http/async-handler.js";
import type { RolesService } from "./roles.service.js";
import {
  listRolesQuerySchema,
  roleIdParamsSchema,
  createRoleBodySchema,
  updateRoleBodySchema,
} from "./roles.schema.js";

/** Build a bound set of route handlers for the roles feature. */
export function makeRolesController(service: RolesService) {
  const list = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const parsed = listRolesQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new HttpError(422, "VALIDATION", "Invalid query parameters");
    }
    const result = await service.list(parsed.data);
    if (!result.ok) throw HttpError.fromAppError(result.error);
    const { items, nextCursor, total } = result.value;
    res.status(200).json({ success: true, data: items, meta: { total, nextCursor } });
  });

  const getById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const parsed = roleIdParamsSchema.safeParse(req.params);
    if (!parsed.success) {
      throw new HttpError(422, "VALIDATION", "Invalid role id");
    }
    const result = await service.getById(parsed.data.id);
    if (!result.ok) throw HttpError.fromAppError(result.error);
    sendOk(res, result.value);
  });

  const create = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const parsed = createRoleBodySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(422, "VALIDATION", "Invalid request body", parsed.error.issues);
    }
    const result = await service.create(parsed.data);
    if (!result.ok) throw HttpError.fromAppError(result.error);
    sendCreated(res, result.value);
  });

  const update = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const paramsParsed = roleIdParamsSchema.safeParse(req.params);
    if (!paramsParsed.success) {
      throw new HttpError(422, "VALIDATION", "Invalid role id");
    }
    const bodyParsed = updateRoleBodySchema.safeParse(req.body);
    if (!bodyParsed.success) {
      throw new HttpError(422, "VALIDATION", "Invalid request body", bodyParsed.error.issues);
    }
    const result = await service.update(paramsParsed.data.id, bodyParsed.data);
    if (!result.ok) throw HttpError.fromAppError(result.error);
    sendOk(res, result.value);
  });

  const remove = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const parsed = roleIdParamsSchema.safeParse(req.params);
    if (!parsed.success) {
      throw new HttpError(422, "VALIDATION", "Invalid role id");
    }
    const result = await service.delete(parsed.data.id);
    if (!result.ok) throw HttpError.fromAppError(result.error);
    sendNoContent(res);
  });

  const getPermissions = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const parsed = roleIdParamsSchema.safeParse(req.params);
    if (!parsed.success) {
      throw new HttpError(422, "VALIDATION", "Invalid role id");
    }
    const result = await service.getPermissions(parsed.data.id);
    if (!result.ok) throw HttpError.fromAppError(result.error);
    sendOk(res, result.value);
  });

  const getEffectiveRoles = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const parsed = roleIdParamsSchema.safeParse(req.params);
    if (!parsed.success) {
      throw new HttpError(422, "VALIDATION", "Invalid role id");
    }
    const result = await service.getEffectiveRoles(parsed.data.id);
    if (!result.ok) throw HttpError.fromAppError(result.error);
    sendOk(res, result.value);
  });

  return { list, getById, create, update, remove, getPermissions, getEffectiveRoles };
}
