// Right of access (GDPR Art. 15): compile personal data held about a subject.
import { z } from "zod";
import { ok, err, type Result, InternalError, NotFoundError } from "@veritas/core";
import { type Dsr, makeDsr, transitionDsr } from "./dsr.js";

export const personalDataCategorySchema = z.enum([
  "IDENTITY",
  "CONTACT",
  "BEHAVIORAL",
  "FINANCIAL",
  "HEALTH",
  "LOCATION",
  "COMMUNICATION",
  "PREFERENCES",
  "OTHER",
]);

export type PersonalDataCategory = z.infer<typeof personalDataCategorySchema>;

export const personalDataEntrySchema = z.object({
  category: personalDataCategorySchema,
  source: z.string(),
  field: z.string(),
  value: z.unknown(),
  collectedAt: z.string(),
  lawfulBasis: z.string(),
  retentionUntil: z.string().optional(),
});

export type PersonalDataEntry = z.infer<typeof personalDataEntrySchema>;

export const accessResponseSchema = z.object({
  dsrId: z.string(),
  subjectId: z.string(),
  subjectEmail: z.string().email(),
  generatedAt: z.string(),
  categories: z.array(personalDataCategorySchema),
  entries: z.array(personalDataEntrySchema),
  totalRecords: z.number().int().nonnegative(),
});

export type AccessResponse = z.infer<typeof accessResponseSchema>;

export interface PersonalDataProvider {
  fetchForSubject(subjectId: string): Promise<ReadonlyArray<PersonalDataEntry>>;
}

export interface AccessRequestHandler {
  handleAccess(dsr: Dsr): Promise<Result<AccessResponse>>;
}

export function makeAccessRequestHandler(
  provider: PersonalDataProvider,
): AccessRequestHandler {
  return {
    async handleAccess(dsr: Dsr): Promise<Result<AccessResponse>> {
      if (dsr.type !== "ACCESS") {
        return err(new InternalError({ message: "DSR type mismatch: expected ACCESS" }));
      }

      let entries: ReadonlyArray<PersonalDataEntry>;
      try {
        entries = await provider.fetchForSubject(dsr.subjectId);
      } catch (e) {
        return err(new InternalError({ message: "Failed to fetch personal data", cause: e }));
      }

      const categories = Array.from(new Set(entries.map((e) => e.category))) as PersonalDataCategory[];

      const response: AccessResponse = Object.freeze({
        dsrId: dsr.id,
        subjectId: dsr.subjectId,
        subjectEmail: dsr.subjectEmail,
        generatedAt: new Date().toISOString(),
        categories,
        entries: entries as PersonalDataEntry[],
        totalRecords: entries.length,
      });

      return ok(response);
    },
  };
}

export function makeInMemoryPersonalDataProvider(
  data: Map<string, PersonalDataEntry[]>,
): PersonalDataProvider {
  return {
    async fetchForSubject(subjectId: string): Promise<ReadonlyArray<PersonalDataEntry>> {
      return data.get(subjectId) ?? [];
    },
  };
}
