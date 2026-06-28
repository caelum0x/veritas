// A2A controller: validates inbound HTTP requests and delegates to A2AService.

import type { Request, Response, NextFunction } from "express";
import { isOk } from "@veritas/core";
import { makeA2AError } from "@veritas/a2a-protocol";
import type { Logger } from "@veritas/observability";
import {
  SubmitTaskBodySchema,
  TaskParamsSchema,
  CapDeliveryBodySchema,
} from "./a2a.schema.js";
import type { A2AService } from "./a2a.service.js";

export interface A2AControllerDeps {
  readonly service: A2AService;
  readonly logger: Logger;
}

export class A2AController {
  private readonly service: A2AService;
  private readonly logger: Logger;

  constructor(deps: A2AControllerDeps) {
    this.service = deps.service;
    this.logger = deps.logger;
  }

  /** POST /a2a/tasks — submit and synchronously process a task. */
  submitTask = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const bodyResult = SubmitTaskBodySchema.safeParse(req.body);
    if (!bodyResult.success) {
      const details = bodyResult.error.issues.map((i) => i.message).join("; ");
      res
        .status(400)
        .json(makeA2AError("BAD_REQUEST", `Invalid task body: ${details}`));
      return;
    }

    const correlationId =
      typeof req.headers["x-correlation-id"] === "string"
        ? req.headers["x-correlation-id"]
        : undefined;

    try {
      const result = await this.service.submitTask(bodyResult.data, correlationId);
      if (isOk(result)) {
        res.status(200).json(result.value);
      } else {
        this.logger.error("a2a-controller: task error", {
          err: result.error,
          correlationId,
        });
        res
          .status(500)
          .json(
            makeA2AError(
              "INTERNAL_ERROR",
              result.error instanceof Error
                ? result.error.message
                : "Task processing failed",
              correlationId
            )
          );
      }
    } catch (cause) {
      next(cause);
    }
  };

  /** GET /a2a/tasks/:taskId — this gateway is stateless; returns 404. */
  getTask = (req: Request, res: Response): void => {
    const params = TaskParamsSchema.safeParse(req.params);
    const taskId = params.success ? params.data.taskId : req.params["taskId"];
    res
      .status(404)
      .json(makeA2AError("NOT_FOUND", `Task ${taskId} not found`));
  };

  /** POST /a2a/cap/negotiate — bridge an A2A message into a CAP negotiation. */
  negotiateCap = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const bodyResult = SubmitTaskBodySchema.safeParse(req.body);
    if (!bodyResult.success) {
      const details = bodyResult.error.issues.map((i) => i.message).join("; ");
      res
        .status(400)
        .json(makeA2AError("BAD_REQUEST", `Invalid negotiation body: ${details}`));
      return;
    }

    try {
      const result = await this.service.bridgeToCapNegotiation(bodyResult.data);
      if (isOk(result)) {
        res.status(200).json({ version: "1.0", result: result.value, error: null });
      } else {
        const err = result.error;
        const status =
          "statusCode" in err && typeof (err as { statusCode: unknown }).statusCode === "number"
            ? (err as { statusCode: number }).statusCode
            : 502;
        res
          .status(status)
          .json(
            makeA2AError(
              "CAP_NEGOTIATION_FAILED",
              err instanceof Error ? err.message : "CAP negotiation failed"
            )
          );
      }
    } catch (cause) {
      next(cause);
    }
  };

  /** POST /a2a/cap/deliver — receive a CAP delivery and validate the payload. */
  receiveCapDelivery = (req: Request, res: Response): void => {
    const bodyResult = CapDeliveryBodySchema.safeParse(req.body);
    if (!bodyResult.success) {
      const details = bodyResult.error.issues.map((i) => i.message).join("; ");
      res
        .status(400)
        .json(makeA2AError("BAD_REQUEST", `Invalid delivery payload: ${details}`));
      return;
    }

    const result = this.service.handleCapDelivery(bodyResult.data);
    if (isOk(result)) {
      res.status(200).json({ version: "1.0", result: result.value, error: null });
    } else {
      const deliveryErr = result.error;
      res
        .status(422)
        .json(
          makeA2AError(
            "DELIVERY_PARSE_ERROR",
            deliveryErr instanceof Error
              ? deliveryErr.message
              : "Invalid CAP delivery"
          )
        );
    }
  };
}

/** Factory to create an A2AController. */
export function createA2AController(deps: A2AControllerDeps): A2AController {
  return new A2AController(deps);
}
