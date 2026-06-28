// invoices.controller.ts: generate and retrieve invoices for an organization.

import type { Request, Response } from "express";
import { InvoiceGenerator } from "@veritas/billing";
import { getPlanById } from "@veritas/billing";
import { apiSuccess, apiFailure, makePage, asIsoTimestamp, type Id } from "@veritas/core";
import { z } from "zod";

const GenerateInvoiceBodySchema = z.object({
  organizationId: z.string().min(1),
  planId: z.string().min(1),
  subscriptionId: z.string().min(1),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  usages: z.array(
    z.object({
      metric: z.string(),
      quantity: z.number().int().nonnegative(),
      organizationId: z.string().optional(),
    })
  ).default([]),
});

export class InvoicesController {
  constructor(private readonly invoiceGenerator: InvoiceGenerator) {}

  generate(req: Request, res: Response): void {
    const parsed = GenerateInvoiceBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json(apiFailure({ code: "VALIDATION", message: "Invalid request body" }));
      return;
    }

    const { organizationId, planId, subscriptionId, periodStart, periodEnd, usages } = parsed.data;
    const plan = getPlanById(planId);
    if (plan === undefined) {
      res.status(404).json(apiFailure({ code: "NOT_FOUND", message: `Plan '${planId}' not found` }));
      return;
    }

    const isoStart = asIsoTimestamp(periodStart);
    const isoEnd = asIsoTimestamp(periodEnd);

    const result = this.invoiceGenerator.generate({
      organizationId: organizationId as Id<"org">,
      plan,
      subscriptionId: subscriptionId as Id<"sub">,
      periodStart: isoStart,
      periodEnd: isoEnd,
      usages: usages.map((u) => ({
        metric: u.metric as "VERIFICATIONS" | "CLAIMS" | "TOKENS" | "SOURCES",
        totalQuantity: u.quantity,
        organizationId: (u.organizationId ?? organizationId) as Id<string>,
        periodStart: isoStart,
        periodEnd: isoEnd,
        eventCount: 1,
      })),
    });

    if (!result.ok) {
      res.status(422).json(apiFailure({ code: "VALIDATION", message: result.error.message }));
      return;
    }

    res.status(201).json(apiSuccess(result.value));
  }

  list(_req: Request, res: Response): void {
    // In-memory stub: production would query a persistence layer.
    const page = makePage([], null);
    res.json(apiSuccess(page));
  }
}
