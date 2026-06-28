// Right to erasure (GDPR Art. 17): delete personal data for a subject across domains.
import { z } from "zod";
import { ok, err, type Result, InternalError } from "@veritas/core";
import { type Dsr } from "./dsr.js";

export const erasureScopeSchema = z.enum([
  "ALL",
  "IDENTITY",
  "BEHAVIORAL",
  "FINANCIAL",
  "COMMUNICATION",
  "PREFERENCES",
]);

export type ErasureScope = z.infer<typeof erasureScopeSchema>;

export const erasureExemptionSchema = z.enum([
  "LEGAL_OBLIGATION",
  "PUBLIC_INTEREST",
  "LEGITIMATE_INTEREST",
  "CONTRACT",
  "VITAL_INTEREST",
]);

export type ErasureExemption = z.infer<typeof erasureExemptionSchema>;

export const erasureDomainResultSchema = z.object({
  domain: z.string(),
  recordsDeleted: z.number().int().nonnegative(),
  exemptions: z.array(erasureExemptionSchema),
  retainedFields: z.array(z.string()),
  deletedAt: z.string(),
});

export type ErasureDomainResult = z.infer<typeof erasureDomainResultSchema>;

export const erasureResponseSchema = z.object({
  dsrId: z.string(),
  subjectId: z.string(),
  subjectEmail: z.string().email(),
  scope: erasureScopeSchema,
  completedAt: z.string(),
  domainResults: z.array(erasureDomainResultSchema),
  totalDeleted: z.number().int().nonnegative(),
  fullyErased: z.boolean(),
});

export type ErasureResponse = z.infer<typeof erasureResponseSchema>;

export interface ErasureDomainHandler {
  readonly domain: string;
  erase(subjectId: string, scope: ErasureScope): Promise<ErasureDomainResult>;
}

export interface ErasureHandler {
  handleErasure(dsr: Dsr, scope?: ErasureScope): Promise<Result<ErasureResponse>>;
}

export function makeErasureHandler(
  domainHandlers: ReadonlyArray<ErasureDomainHandler>,
): ErasureHandler {
  return {
    async handleErasure(dsr: Dsr, scope: ErasureScope = "ALL"): Promise<Result<ErasureResponse>> {
      if (dsr.type !== "ERASURE") {
        return err(new InternalError({ message: "DSR type mismatch: expected ERASURE" }));
      }

      const domainResults: ErasureDomainResult[] = [];
      for (const handler of domainHandlers) {
        try {
          const result = await handler.erase(dsr.subjectId, scope);
          domainResults.push(result);
        } catch (e) {
          return err(new InternalError({ message: `Erasure failed in domain: ${handler.domain}`, cause: e }));
        }
      }

      const totalDeleted = domainResults.reduce((sum, r) => sum + r.recordsDeleted, 0);
      const fullyErased = domainResults.every((r) => r.exemptions.length === 0 && r.retainedFields.length === 0);

      const response: ErasureResponse = Object.freeze({
        dsrId: dsr.id,
        subjectId: dsr.subjectId,
        subjectEmail: dsr.subjectEmail,
        scope,
        completedAt: new Date().toISOString(),
        domainResults,
        totalDeleted,
        fullyErased,
      });

      return ok(response);
    },
  };
}

export function makeNoOpErasureDomainHandler(domain: string): ErasureDomainHandler {
  return {
    domain,
    async erase(_subjectId: string, _scope: ErasureScope): Promise<ErasureDomainResult> {
      return Object.freeze({
        domain,
        recordsDeleted: 0,
        exemptions: [],
        retainedFields: [],
        deletedAt: new Date().toISOString(),
      });
    },
  };
}
