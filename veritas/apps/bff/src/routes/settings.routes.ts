// Settings BFF route: organization profile and membership management for the UI.
import type { Logger } from "@veritas/core";
import type { VeritasClient } from "@veritas/sdk/client.js";
import type { Router } from "express";
import { z } from "zod";
import { BffValidationError } from "../errors.js";

interface SettingsRouteDeps {
  readonly client: VeritasClient;
  readonly logger: Logger;
}

const updateOrgSchema = z.object({
  name: z.string().min(1).optional(),
  displayName: z.string().optional(),
  website: z.string().url().optional(),
  description: z.string().optional(),
});

const addMemberSchema = z.object({
  userId: z.string().min(1),
  organizationId: z.string().min(1),
  role: z.enum(["OWNER", "ADMIN", "MEMBER", "VIEWER"]),
  invitedBy: z.string().nullable().optional(),
});

const updateMemberSchema = z.object({
  role: z.enum(["OWNER", "ADMIN", "MEMBER", "VIEWER"]).optional(),
  acceptedAt: z.string().nullable().optional(),
});

export function registerSettingsRoutes(router: Router, deps: SettingsRouteDeps): void {
  const { client, logger } = deps;

  router.get("/settings/organization/:orgId", async (req, res, next) => {
    try {
      const { orgId } = req.params as { orgId: string };
      const response = await client.organizations.get(orgId);
      res.json({ success: true, data: (response as { data?: unknown }).data ?? null });
    } catch (error) {
      logger.error("settings org get failed", { error, orgId: req.params["orgId"] });
      next(error);
    }
  });

  router.patch("/settings/organization/:orgId", async (req, res, next) => {
    try {
      const { orgId } = req.params as { orgId: string };
      const parsed = updateOrgSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new BffValidationError(parsed.error.issues[0]?.message ?? "Invalid organization update payload");
      }

      const response = await client.organizations.update(orgId, parsed.data);
      res.json({ success: true, data: (response as { data?: unknown }).data ?? null });
    } catch (error) {
      logger.error("settings org update failed", { error, orgId: req.params["orgId"] });
      next(error);
    }
  });

  router.get("/settings/organization/:orgId/members", async (req, res, next) => {
    try {
      const { orgId } = req.params as { orgId: string };
      const limit = req.query["limit"] !== undefined ? Math.min(Number(req.query["limit"]), 100) : 20;
      const cursor = typeof req.query["cursor"] === "string" ? req.query["cursor"] : undefined;
      const role = typeof req.query["role"] === "string" ? req.query["role"] : undefined;

      const page = await client.organizations.listMembers(orgId, { limit, cursor, role });
      res.json({ success: true, data: page.data ?? [], meta: page.meta });
    } catch (error) {
      logger.error("settings members list failed", { error, orgId: req.params["orgId"] });
      next(error);
    }
  });

  router.post("/settings/organization/:orgId/members", async (req, res, next) => {
    try {
      const { orgId } = req.params as { orgId: string };
      const parsed = addMemberSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new BffValidationError(parsed.error.issues[0]?.message ?? "Invalid add member payload");
      }

      const response = await client.organizations.addMember(orgId, parsed.data);
      res.status(201).json({ success: true, data: (response as { data?: unknown }).data ?? null });
    } catch (error) {
      logger.error("settings add member failed", { error, orgId: req.params["orgId"] });
      next(error);
    }
  });

  router.patch("/settings/organization/:orgId/members/:userId", async (req, res, next) => {
    try {
      const { orgId, userId } = req.params as { orgId: string; userId: string };
      const parsed = updateMemberSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new BffValidationError(parsed.error.issues[0]?.message ?? "Invalid update member payload");
      }

      const response = await client.organizations.updateMember(orgId, userId, parsed.data);
      res.json({ success: true, data: (response as { data?: unknown }).data ?? null });
    } catch (error) {
      logger.error("settings update member failed", { error, orgId: req.params["orgId"], userId: req.params["userId"] });
      next(error);
    }
  });

  router.delete("/settings/organization/:orgId/members/:userId", async (req, res, next) => {
    try {
      const { orgId, userId } = req.params as { orgId: string; userId: string };
      await client.organizations.removeMember(orgId, userId);
      res.json({ success: true, data: null });
    } catch (error) {
      logger.error("settings remove member failed", { error, orgId: req.params["orgId"], userId: req.params["userId"] });
      next(error);
    }
  });
}
