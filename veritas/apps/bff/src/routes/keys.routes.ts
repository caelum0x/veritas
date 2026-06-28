// Keys BFF route: create, list, and revoke API keys for the authenticated organization.
import type { Logger } from "@veritas/core";
import type { VeritasClient } from "@veritas/sdk/client.js";
import type { Router } from "express";
import { z } from "zod";
import { toApiKeyViewModel } from "../view-model.js";
import { BffValidationError } from "../errors.js";
import type { ApiKey } from "@veritas/contracts";

interface KeysRouteDeps {
  readonly client: VeritasClient;
  readonly logger: Logger;
}

const createApiKeySchema = z.object({
  organizationId: z.string().min(1),
  name: z.string().min(1),
  userId: z.string().nullable().optional(),
  scopes: z.array(z.string()).min(1).optional(),
  expiresAt: z.string().nullable().optional(),
});

export function registerKeysRoutes(router: Router, deps: KeysRouteDeps): void {
  const { client, logger } = deps;

  router.get("/keys", async (req, res, next) => {
    try {
      const limit = req.query["limit"] !== undefined ? Math.min(Number(req.query["limit"]), 100) : 20;
      const cursor = typeof req.query["cursor"] === "string" ? req.query["cursor"] : undefined;

      const page = await client.apiKeys.list({ limit, cursor });
      const data = (page.data ?? []).map((k: ApiKey) => toApiKeyViewModel(k));
      res.json({ success: true, data, meta: page.meta });
    } catch (error) {
      logger.error("api keys list failed", { error });
      next(error);
    }
  });

  router.post("/keys", async (req, res, next) => {
    try {
      const parsed = createApiKeySchema.safeParse(req.body);
      if (!parsed.success) {
        throw new BffValidationError(parsed.error.issues[0]?.message ?? "Invalid API key payload");
      }

      const response = await client.apiKeys.create(parsed.data);
      const keyWithSecret = (response as { data?: unknown }).data;
      res.status(201).json({ success: true, data: keyWithSecret ?? null });
    } catch (error) {
      logger.error("api key create failed", { error });
      next(error);
    }
  });

  router.get("/keys/:keyId", async (req, res, next) => {
    try {
      const { keyId } = req.params as { keyId: string };
      const response = await client.apiKeys.get(keyId);
      const key = (response as { data?: unknown }).data;
      res.json({ success: true, data: key != null ? toApiKeyViewModel(key as ApiKey) : null });
    } catch (error) {
      logger.error("api key get failed", { error, keyId: req.params["keyId"] });
      next(error);
    }
  });

  router.delete("/keys/:keyId", async (req, res, next) => {
    try {
      const { keyId } = req.params as { keyId: string };
      await client.apiKeys.revoke(keyId);
      res.json({ success: true, data: null });
    } catch (error) {
      logger.error("api key revoke failed", { error, keyId: req.params["keyId"] });
      next(error);
    }
  });
}
