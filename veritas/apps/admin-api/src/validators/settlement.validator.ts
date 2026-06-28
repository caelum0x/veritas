// Settlement admin validators — query, status update, and export schemas
import { z } from "zod";
import type { Request, Response, NextFunction } from "express";
import { HttpError } from "../http/api-error.js";

const settlementStatusSchema = z.enum([
  "pending",
  "processing",
  "completed",
  "failed",
  "cancelled",
]);

export const listSettlementsSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(200).optional().default(20),
  status: settlementStatusSchema.optional(),
  agentId: z.string().uuid().optional(),
  orderId: z.string().uuid().optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  cursor: z.string().optional(),
});

export type ListSettlementsQuery = z.infer<typeof listSettlementsSchema>;

export const updateSettlementStatusSchema = z.object({
  status: settlementStatusSchema,
  reason: z.string().max(500).optional(),
});

export type UpdateSettlementStatusBody = z.infer<
  typeof updateSettlementStatusSchema
>;

export function validateListSettlementsQuery(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const parsed = listSettlementsSchema.safeParse(req.query);
  if (!parsed.success) {
    next(
      new HttpError(
        400,
        "VALIDATION",
        "Invalid query parameters",
        parsed.error.flatten().fieldErrors
      )
    );
    return;
  }
  res.locals["validatedQuery"] = parsed.data;
  next();
}

export function validateUpdateSettlementStatus(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const parsed = updateSettlementStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    next(
      new HttpError(
        400,
        "VALIDATION",
        "Invalid request body",
        parsed.error.flatten().fieldErrors
      )
    );
    return;
  }
  res.locals["validatedBody"] = parsed.data;
  next();
}
