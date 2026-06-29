// Controller: parses inbound webhook requests and delegates to InboundService.

import type { Request, Response } from "express";
import type { Deps } from "../../container.js";
import { InboundService } from "./inbound.service.js";
import { InboundRouteParamsSchema } from "./inbound.schema.js";
import { mapInboundRequest } from "./inbound.mapper.js";
import { ApiError } from "../../http/api-error.js";

export class InboundController {
  private readonly service: InboundService;

  constructor(private readonly deps: Deps) {
    this.service = new InboundService(deps);
  }

  /** POST /webhooks/:source */
  readonly receiveWebhook = async (req: Request, res: Response): Promise<void> => {
    const paramsResult = InboundRouteParamsSchema.safeParse(req.params);
    if (!paramsResult.success) {
      const issue = paramsResult.error.issues[0];
      res.status(422).json({
        success: false,
        data: null,
        error: { code: "INVALID_SOURCE", message: issue?.message ?? "Unknown webhook source" },
      });
      return;
    }

    const { source } = paramsResult.data;

    let extracted;
    try {
      extracted = mapInboundRequest(req);
    } catch (e) {
      const err = e instanceof ApiError ? e : ApiError.badRequest("Could not parse request");
      res.status(err.statusCode).json({
        success: false,
        data: null,
        error: { code: err.code, message: err.message },
      });
      return;
    }

    try {
      const result = await this.service.receive({ source, ...extracted });
      res.status(200).json({ success: true, data: result, error: null });
    } catch (e) {
      if (e instanceof ApiError) {
        res.status(e.statusCode).json({
          success: false,
          data: null,
          error: { code: e.code, message: e.message },
        });
        return;
      }
      this.deps.logger.error("Unhandled inbound error", {
        error: e instanceof Error ? e.message : String(e),
      });
      res.status(500).json({
        success: false,
        data: null,
        error: { code: "INTERNAL_SERVER_ERROR", message: "Internal server error" },
      });
    }
  };
}
