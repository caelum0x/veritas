// usage.controller.ts: record and retrieve usage events for metering.

import type { Request, Response } from "express";
import { UsageMeter } from "@veritas/usage-billing";
import { apiSuccess, apiFailure, makePage, type Id } from "@veritas/core";
import { UsageMetricSchema } from "@veritas/contracts";
import { z } from "zod";

const RecordUsageBodySchema = z.object({
  organizationId: z.string().min(1),
  metric: UsageMetricSchema,
  quantity: z.number().int().positive(),
  userId: z.string().optional(),
  metadata: z.record(z.string()).optional(),
});

export class UsageController {
  constructor(private readonly usageMeter: UsageMeter) {}

  async record(req: Request, res: Response): Promise<void> {
    const parsed = RecordUsageBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json(apiFailure({ code: "VALIDATION", message: "Invalid request body" }));
      return;
    }

    const { organizationId, metric, quantity, userId, metadata } = parsed.data;

    try {
      const event = await this.usageMeter.record(
        organizationId as Id<string>,
        metric,
        quantity,
        { userId: userId as Id<string> | undefined, metadata }
      );
      res.status(201).json(apiSuccess(event));
    } catch (cause: unknown) {
      const msg = cause instanceof Error ? cause.message : "Failed to record usage";
      res.status(500).json(apiFailure({ code: "INTERNAL", message: msg }));
    }
  }

  list(_req: Request, res: Response): void {
    // In-memory stub: production would query a persistence layer.
    const page = makePage([], null);
    res.json(apiSuccess(page));
  }
}
