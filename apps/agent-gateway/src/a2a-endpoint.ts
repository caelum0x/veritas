// A2A endpoint — receives agent task requests and dispatches them via task-handler.

import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { isOk, newId, epochToIso } from "@veritas/core";
import type { Logger } from "@veritas/observability";
import type { AgentCard } from "@veritas/agent-card";
import { makeA2AError } from "@veritas/a2a-protocol";
import type { EngineOptions } from "@veritas/verification";
import { createTaskHandler } from "./task-handler.js";

export interface A2AEndpointDeps {
  readonly logger: Logger;
  readonly card: AgentCard;
  readonly engineOptions: EngineOptions;
  /**
   * Expected Bearer token for inbound request authentication.
   * Pass an empty string to disable auth checks (dev/internal use).
   */
  readonly apiKey: string;
}

const TaskRequestSchema = z.object({
  taskId: z.string().min(1).optional(),
  threadId: z.string().min(1).optional(),
  correlationId: z.string().optional(),
  message: z
    .object({
      parts: z
        .array(z.object({ kind: z.string(), text: z.string().optional() }).passthrough())
        .min(1),
    })
    .passthrough(),
});

/** Mount the A2A task submission and status routes on a new Router. */
export function createA2AEndpoint(deps: A2AEndpointDeps): Router {
  const { logger, engineOptions, apiKey } = deps;
  const router = Router();
  const handleTask = createTaskHandler({ logger, engineOptions });
  const authEnabled = apiKey.length > 0;

  /** Authenticate Bearer token; returns true when request may proceed. */
  function authenticate(req: Request, res: Response): boolean {
    if (!authEnabled) return true;
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json(makeA2AError("UNAUTHORIZED", "Bearer token required"));
      return false;
    }
    const token = authHeader.slice(7);
    if (token !== apiKey) {
      res.status(401).json(makeA2AError("UNAUTHORIZED", "Invalid API key"));
      return false;
    }
    return true;
  }

  /** POST /a2a/tasks — submit a new task for processing. */
  router.post("/a2a/tasks", async (req: Request, res: Response) => {
    if (!authenticate(req, res)) return;

    const parsed = TaskRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      const details = parsed.error.issues.map((i) => i.message).join("; ");
      res.status(400).json(makeA2AError("BAD_REQUEST", `Invalid task request: ${details}`));
      return;
    }

    const { correlationId } = parsed.data;
    const taskId = parsed.data.taskId ?? newId("task");
    const threadId = parsed.data.threadId ?? newId("thread");
    const now = epochToIso(Date.now());

    // Normalise inbound message — inject required A2A envelope fields if absent
    const rawMsg = parsed.data.message as Record<string, unknown>;
    const rawMessage = {
      ...rawMsg,
      id: rawMsg["id"] ?? newId("msg"),
      taskId,
      threadId,
      role: rawMsg["role"] ?? "user",
      createdAt: rawMsg["createdAt"] ?? now,
    };

    const result = await handleTask({ taskId, threadId, message: rawMessage, correlationId });

    if (isOk(result)) {
      res.status(200).json(result.value);
    } else {
      logger.error("a2a-endpoint: task handler error", { err: result.error });
      const errMsg = result.error instanceof Error ? result.error.message : "Internal error";
      res
        .status(500)
        .json(makeA2AError("INTERNAL_ERROR", errMsg, correlationId));
    }
  });

  /** GET /a2a/tasks/:taskId — stateless gateway returns 404 (no persistence). */
  router.get("/a2a/tasks/:taskId", (req: Request, res: Response) => {
    if (!authenticate(req, res)) return;
    res
      .status(404)
      .json(makeA2AError("NOT_FOUND", `Task ${req.params["taskId"]} not found`));
  });

  return router;
}
