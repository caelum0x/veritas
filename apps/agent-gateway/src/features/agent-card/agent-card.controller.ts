// AgentCardController: handles HTTP requests for agent card serving and publishing.

import type { Request, Response, NextFunction } from "express";
import { isOk } from "@veritas/core";
import type { Logger } from "@veritas/observability";
import { PublishCardRequestSchema } from "./agent-card.schema.js";
import type { AgentCardService } from "./agent-card.service.js";

export interface AgentCardControllerDeps {
  readonly service: AgentCardService;
  readonly logger: Logger;
}

export class AgentCardController {
  private readonly service: AgentCardService;
  private readonly logger: Logger;

  constructor(deps: AgentCardControllerDeps) {
    this.service = deps.service;
    this.logger = deps.logger;
  }

  /** GET /v1/agent-card — return the full agent card JSON (registry format). */
  getCard = (_req: Request, res: Response): void => {
    const card = this.service.getRegistryCard();
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "public, max-age=300");
    res.status(200).json(card);
  };

  /** GET /v1/agent-card/builder — return the builder-format agent card. */
  getBuilderCard = (_req: Request, res: Response): void => {
    const result = this.service.buildCard();
    if (isOk(result)) {
      res.status(200).json({ success: true, data: result.value, error: null });
    } else {
      this.logger.error("agent-card-controller: build failed", {
        err: result.error,
      });
      res.status(500).json({
        success: false,
        data: null,
        error: {
          code: "CARD_BUILD_ERROR",
          message:
            result.error instanceof Error
              ? result.error.message
              : "Failed to build agent card",
        },
      });
    }
  };

  /** GET /v1/discovery — return a discovery summary of this agent. */
  discover = (_req: Request, res: Response): void => {
    const result = this.service.getDiscoveryDto();
    if (isOk(result)) {
      res.status(200).json({ success: true, data: result.value, error: null });
    } else {
      res.status(500).json({
        success: false,
        data: null,
        error: {
          code: "CARD_DISCOVERY_ERROR",
          message:
            result.error instanceof Error
              ? result.error.message
              : "Failed to retrieve discovery info",
        },
      });
    }
  };

  /** POST /v1/agent-card/publish — publish this agent card to a registry. */
  publish = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const bodyResult = PublishCardRequestSchema.safeParse(req.body);
    if (!bodyResult.success) {
      const details = bodyResult.error.issues.map((i) => i.message).join("; ");
      res.status(400).json({
        success: false,
        data: null,
        error: { code: "BAD_REQUEST", message: `Invalid publish request: ${details}` },
      });
      return;
    }

    try {
      const result = await this.service.publishToRegistry(bodyResult.data);
      if (isOk(result)) {
        res.status(200).json({ success: true, data: result.value, error: null });
      } else {
        const publishErr = result.error;
        const status =
          publishErr !== null && typeof publishErr === "object" &&
          "statusCode" in publishErr &&
          typeof (publishErr as { statusCode: unknown }).statusCode === "number"
            ? (publishErr as { statusCode: number }).statusCode
            : 502;
        res.status(status).json({
          success: false,
          data: null,
          error: {
            code: "PUBLISH_ERROR",
            message:
              publishErr instanceof Error
                ? publishErr.message
                : "Failed to publish agent card",
          },
        });
      }
    } catch (cause) {
      next(cause);
    }
  };
}

/** Factory to create an AgentCardController. */
export function createAgentCardController(
  deps: AgentCardControllerDeps
): AgentCardController {
  return new AgentCardController(deps);
}
