// Admin controller for API key management — list, create, update, revoke
import type { Request, Response, NextFunction } from "express";
import { HttpError } from "../http/api-error.js";
import { sendPage } from "../http/responder.js";
import {
  listApiKeysSchema,
  getApiKeySchema,
  createApiKeySchema,
  updateApiKeySchema,
  revokeApiKeySchema,
} from "../validators/api-key.validator.js";

export class ApiKeyController {
  listApiKeys = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      void listApiKeysSchema.parse(req.query);
      const items: unknown[] = [];
      sendPage(res, items, { nextCursor: null, hasMore: false, total: 0 });
    } catch (err) {
      next(err);
    }
  };

  getApiKey = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = getApiKeySchema.parse(req.params);
      void id;
      throw new HttpError(404, "NOT_FOUND", `API key ${id} not found`);
    } catch (err) {
      next(err);
    }
  };

  createApiKey = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = createApiKeySchema.parse(req.body);
      void body;
      throw new HttpError(501, "UNAVAILABLE", "API key creation requires auth service");
    } catch (err) {
      next(err);
    }
  };

  updateApiKey = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = getApiKeySchema.parse(req.params);
      const body = updateApiKeySchema.parse(req.body);
      void id;
      void body;
      throw new HttpError(404, "NOT_FOUND", `API key ${id} not found`);
    } catch (err) {
      next(err);
    }
  };

  revokeApiKey = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = getApiKeySchema.parse(req.params);
      const body = revokeApiKeySchema.parse(req.body);
      void id;
      void body;
      throw new HttpError(404, "NOT_FOUND", `API key ${id} not found`);
    } catch (err) {
      next(err);
    }
  };

  rotateApiKey = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = getApiKeySchema.parse(req.params);
      void id;
      throw new HttpError(404, "NOT_FOUND", `API key ${id} not found`);
    } catch (err) {
      next(err);
    }
  };
}

export const apiKeyController = new ApiKeyController();
