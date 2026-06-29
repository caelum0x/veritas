// Right to rectification (GDPR Art. 16): correct inaccurate personal data for a subject.
import { z } from "zod";
import { ok, err, type Result, InternalError, ValidationError } from "@veritas/core";
import { type Dsr } from "./dsr.js";

export const rectificationFieldSchema = z.object({
  domain: z.string().min(1),
  field: z.string().min(1),
  currentValue: z.unknown(),
  correctedValue: z.unknown(),
  reason: z.string().optional(),
});

export type RectificationField = z.infer<typeof rectificationFieldSchema>;

export const rectificationRequestSchema = z.object({
  fields: z.array(rectificationFieldSchema).min(1),
  requesterNote: z.string().optional(),
});

export type RectificationRequest = z.infer<typeof rectificationRequestSchema>;

export const rectificationResultFieldSchema = z.object({
  domain: z.string(),
  field: z.string(),
  previousValue: z.unknown(),
  newValue: z.unknown(),
  updatedAt: z.string(),
  success: z.boolean(),
  error: z.string().optional(),
});

export type RectificationResultField = z.infer<typeof rectificationResultFieldSchema>;

export const rectificationResponseSchema = z.object({
  dsrId: z.string(),
  subjectId: z.string(),
  subjectEmail: z.string().email(),
  completedAt: z.string(),
  results: z.array(rectificationResultFieldSchema),
  totalRequested: z.number().int().nonnegative(),
  totalSucceeded: z.number().int().nonnegative(),
  totalFailed: z.number().int().nonnegative(),
  fullyRectified: z.boolean(),
});

export type RectificationResponse = z.infer<typeof rectificationResponseSchema>;

export interface RectificationDomainHandler {
  readonly domain: string;
  update(subjectId: string, field: string, value: unknown): Promise<{ previousValue: unknown }>;
}

export interface RectificationHandler {
  handleRectification(dsr: Dsr, request: RectificationRequest): Promise<Result<RectificationResponse>>;
}

export function makeRectificationHandler(
  domainHandlers: ReadonlyArray<RectificationDomainHandler>,
): RectificationHandler {
  const handlerMap = new Map(domainHandlers.map((h) => [h.domain, h]));

  return {
    async handleRectification(dsr: Dsr, request: RectificationRequest): Promise<Result<RectificationResponse>> {
      if (dsr.type !== "RECTIFICATION") {
        return err(new InternalError({ message: "DSR type mismatch: expected RECTIFICATION" }));
      }

      const parsed = rectificationRequestSchema.safeParse(request);
      if (!parsed.success) {
        return err(new ValidationError({ message: "Invalid rectification request", details: { issues: parsed.error.issues } }));
      }

      const results: RectificationResultField[] = [];
      const now = new Date().toISOString();

      for (const field of parsed.data.fields) {
        const handler = handlerMap.get(field.domain);
        if (!handler) {
          results.push(Object.freeze({
            domain: field.domain,
            field: field.field,
            previousValue: field.currentValue,
            newValue: field.correctedValue,
            updatedAt: now,
            success: false,
            error: `No handler registered for domain: ${field.domain}`,
          }));
          continue;
        }

        try {
          const { previousValue } = await handler.update(dsr.subjectId, field.field, field.correctedValue);
          results.push(Object.freeze({
            domain: field.domain,
            field: field.field,
            previousValue,
            newValue: field.correctedValue,
            updatedAt: now,
            success: true,
          }));
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          results.push(Object.freeze({
            domain: field.domain,
            field: field.field,
            previousValue: field.currentValue,
            newValue: field.correctedValue,
            updatedAt: now,
            success: false,
            error: message,
          }));
        }
      }

      const totalSucceeded = results.filter((r) => r.success).length;
      const totalFailed = results.filter((r) => !r.success).length;

      const response: RectificationResponse = Object.freeze({
        dsrId: dsr.id,
        subjectId: dsr.subjectId,
        subjectEmail: dsr.subjectEmail,
        completedAt: now,
        results,
        totalRequested: results.length,
        totalSucceeded,
        totalFailed,
        fullyRectified: totalFailed === 0,
      });

      return ok(response);
    },
  };
}

export function makeInMemoryRectificationDomainHandler(
  domain: string,
  store: Map<string, Map<string, unknown>>,
): RectificationDomainHandler {
  return {
    domain,
    async update(subjectId: string, field: string, value: unknown): Promise<{ previousValue: unknown }> {
      if (!store.has(subjectId)) {
        store.set(subjectId, new Map());
      }
      const subjectStore = store.get(subjectId)!;
      const previousValue = subjectStore.get(field);
      subjectStore.set(field, value);
      return { previousValue };
    },
  };
}
