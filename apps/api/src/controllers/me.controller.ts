// Controller handlers for authenticated user self-service (/me) endpoints
import type { Request, Response, NextFunction } from "express";
import { asyncHandler } from "../http/async-handler.js";
import { respondOk, respondNoContent } from "../http/responder.js";
import { HttpApiError } from "../http/api-error.js";
import type { UpdateMeBody } from "../validators/me.validator.js";

export const getMe = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as Request & { user?: unknown }).user;
    if (!user) {
      throw new HttpApiError(401, "UNAUTHORIZED", "Not authenticated");
    }
    respondOk(res, user);
  }
);

export const updateMe = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as Request & { user?: Record<string, unknown> }).user;
    if (!user) {
      throw new HttpApiError(401, "UNAUTHORIZED", "Not authenticated");
    }
    const body = req.body as UpdateMeBody;
    const updated = { ...user, ...body };
    respondOk(res, updated);
  }
);

export const deleteMe = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const user = (req as Request & { user?: unknown }).user;
    if (!user) {
      throw new HttpApiError(401, "UNAUTHORIZED", "Not authenticated");
    }
    respondNoContent(res);
  }
);
