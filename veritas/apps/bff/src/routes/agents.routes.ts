// BFF agents route: CRUD operations for CAP agent registration proxied to the upstream API.
import { z } from "zod";
import type { Logger } from "@veritas/core";
import { ValidationError } from "@veritas/core";
import type { VeritasClient } from "@veritas/sdk/client.js";
import type { Router } from "express";

interface AgentsDeps {
  client: VeritasClient;
  logger: Logger;
}

const CreateAgentBodySchema = z.object({
  name: z.string().min(1),
  walletAddress: z.string().min(1),
  endpoint: z.string().url().nullable().optional(),
  publicKey: z.string().nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const UpdateAgentBodySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  endpoint: z.string().url().optional(),
  capabilities: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export function registerAgentsRoutes(router: Router, deps: AgentsDeps): void {
  const { client, logger } = deps;

  router.get("/agents", async (req, res, next) => {
    try {
      const limit = Math.min(Number(req.query["limit"] ?? 20), 100);
      const cursor = typeof req.query["cursor"] === "string" ? req.query["cursor"] : undefined;
      const page = await client.agents.list({ limit, cursor });
      res.json({ success: true, data: page });
    } catch (err) {
      logger.error("list agents error", { error: err });
      next(err);
    }
  });

  router.get("/agents/:agentId", async (req, res, next) => {
    try {
      const { agentId } = req.params;
      const agent = await client.agents.get(agentId);
      res.json({ success: true, data: agent });
    } catch (err) {
      logger.error("get agent error", { error: err, agentId: req.params["agentId"] });
      next(err);
    }
  });

  router.post("/agents", async (req, res, next) => {
    try {
      const parsed = CreateAgentBodySchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError({
          message: "invalid agent creation body",
          issues: parsed.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        });
      }
      const agent = await client.agents.create(parsed.data);
      logger.info("agent created", { agentId: (agent as { data?: { id?: string } }).data?.id });
      res.status(201).json({ success: true, data: agent });
    } catch (err) {
      logger.error("create agent error", { error: err });
      next(err);
    }
  });

  router.patch("/agents/:agentId", async (req, res, next) => {
    try {
      const { agentId } = req.params;
      const parsed = UpdateAgentBodySchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError({
          message: "invalid agent update body",
          issues: parsed.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        });
      }
      const agent = await client.agents.update(agentId, parsed.data);
      res.json({ success: true, data: agent });
    } catch (err) {
      logger.error("update agent error", { error: err, agentId: req.params["agentId"] });
      next(err);
    }
  });

  router.delete("/agents/:agentId", async (req, res, next) => {
    try {
      const { agentId } = req.params;
      await client.agents.delete(agentId);
      logger.info("agent deleted", { agentId });
      res.status(204).send();
    } catch (err) {
      logger.error("delete agent error", { error: err, agentId: req.params["agentId"] });
      next(err);
    }
  });
}
