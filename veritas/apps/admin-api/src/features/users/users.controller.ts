// Users controller: validates requests, calls UsersService, sends HTTP responses.
import type { Request, Response, NextFunction } from "express";
import { buildContext } from "../../context.js";
import { sendOk, sendCreated, sendPage } from "../../http/responder.js";
import { HttpError } from "../../http/api-error.js";
import type { UsersService } from "./users.service.js";
import {
  CreateUserBodySchema,
  UpdateUserBodySchema,
  UserParamsSchema,
  ListUsersQuerySchema,
  SetUserStatusBodySchema,
  VerifyEmailBodySchema,
} from "./users.schema.js";
import { toUserResponse, toUserListResponse } from "./users.mapper.js";

export class UsersController {
  constructor(private readonly service: UsersService) {}

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = CreateUserBodySchema.parse(req.body);
      const ctx = buildContext(req);
      const result = await this.service.create(ctx, body);
      if (!result.ok) { next(HttpError.fromAppError(result.error)); return; }
      sendCreated(res, toUserResponse(result.value));
    } catch (err) { next(err); }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = UserParamsSchema.parse(req.params);
      const ctx = buildContext(req);
      const result = await this.service.getById(ctx, userId);
      if (!result.ok) { next(HttpError.fromAppError(result.error)); return; }
      sendOk(res, toUserResponse(result.value));
    } catch (err) { next(err); }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = UserParamsSchema.parse(req.params);
      const body = UpdateUserBodySchema.parse(req.body);
      const ctx = buildContext(req);
      const result = await this.service.update(ctx, userId, body);
      if (!result.ok) { next(HttpError.fromAppError(result.error)); return; }
      sendOk(res, toUserResponse(result.value));
    } catch (err) { next(err); }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = ListUsersQuerySchema.parse(req.query);
      const ctx = buildContext(req);
      const result = await this.service.list(ctx, query);
      if (!result.ok) { next(HttpError.fromAppError(result.error)); return; }
      const mapped = toUserListResponse(result.value as never);
      sendPage(res, mapped.items, {
        total: mapped.total,
        limit: query.limit ?? 20,
        cursor: query.cursor,
        nextCursor: mapped.nextCursor ?? undefined,
      });
    } catch (err) { next(err); }
  }

  async setStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = UserParamsSchema.parse(req.params);
      const body = SetUserStatusBodySchema.parse(req.body);
      const ctx = buildContext(req);
      const result = await this.service.setStatus(ctx, userId, body);
      if (!result.ok) { next(HttpError.fromAppError(result.error)); return; }
      sendOk(res, toUserResponse(result.value));
    } catch (err) { next(err); }
  }

  async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = UserParamsSchema.parse(req.params);
      const body = VerifyEmailBodySchema.parse(req.body);
      const ctx = buildContext(req);
      const result = await this.service.verifyEmail(ctx, userId, body);
      if (!result.ok) { next(HttpError.fromAppError(result.error)); return; }
      sendOk(res, toUserResponse(result.value));
    } catch (err) { next(err); }
  }

  async recordLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = UserParamsSchema.parse(req.params);
      const ctx = buildContext(req);
      const result = await this.service.recordLogin(ctx, userId);
      if (!result.ok) { next(HttpError.fromAppError(result.error)); return; }
      sendOk(res, toUserResponse(result.value));
    } catch (err) { next(err); }
  }
}
