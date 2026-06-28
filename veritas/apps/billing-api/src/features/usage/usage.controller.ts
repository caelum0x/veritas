// HTTP controller for usage endpoints: validates requests, delegates to UsageService.

import type { Request, Response } from "express";
import { isErr } from "@veritas/core";
import { apiSuccess, apiFailure } from "@veritas/core";
import { UsageService } from "./usage.service.js";
import {
  RecordUsageBodySchema,
  ListUsageQuerySchema,
} from "./usage.schema.js";
import { toUsageEventResponse, toPeriodUsageResponse } from "./usage.mapper.js";

export class UsageController {
  constructor(private readonly service: UsageService) {}

  async record(req: Request, res: Response): Promise<void> {
    const parsed = RecordUsageBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json(
        apiFailure({ code: "VALIDATION", message: parsed.error.message }),
      );
      return;
    }

    const result = await this.service.recordUsage(parsed.data);
    if (isErr(result)) {
      const status = (result.error as { statusCode?: number }).statusCode ?? 500;
      res.status(status).json(
        apiFailure({ code: result.error.code ?? "INTERNAL", message: result.error.message }),
      );
      return;
    }

    res.status(201).json(apiSuccess(toUsageEventResponse(result.value.event)));
  }

  list(req: Request, res: Response): void {
    const parsed = ListUsageQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(422).json(
        apiFailure({ code: "VALIDATION", message: parsed.error.message }),
      );
      return;
    }

    const result = this.service.listUsage(parsed.data);
    if (isErr(result)) {
      res.status(500).json(
        apiFailure({ code: "INTERNAL", message: result.error.message }),
      );
      return;
    }

    res.json(apiSuccess(result.value.periods.map(toPeriodUsageResponse)));
  }
}
