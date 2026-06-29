// Medical evidence model: typed evidence structures for drug DB, clinical guidelines, ICD codes, and evidence grading.

import { z } from "zod";
import { isoTimestampSchema, scoreSchema } from "@veritas/core";
import { DomainEvidenceSchema } from "@veritas/verifier-kit";

/** Evidence from a drug database (e.g. DrugBank, RxNorm). */
export const DrugDbEvidenceSchema = DomainEvidenceSchema.extend({
  sourceType: z.literal("drug-db"),
  metadata: z.object({
    drugId: z.string(),
    genericName: z.string(),
    brandNames: z.array(z.string()),
    drugClass: z.string(),
    approvalStatus: z.string(),
    approvalDate: isoTimestampSchema.nullable(),
    indications: z.array(z.string()),
    contraindicationsCount: z.number().int().nonnegative(),
  }),
});
export type DrugDbEvidence = z.infer<typeof DrugDbEvidenceSchema>;

/** Evidence from clinical practice guidelines (e.g. AHA, ADA, WHO). */
export const GuidelinesEvidenceSchema = DomainEvidenceSchema.extend({
  sourceType: z.literal("clinical-guideline"),
  metadata: z.object({
    guidelineId: z.string(),
    issuingBody: z.string(),
    recommendationGrade: z.string(),
    evidenceLevel: z.string(),
    publicationYear: z.number().int().positive(),
    doi: z.string().nullable(),
  }),
});
export type GuidelinesEvidence = z.infer<typeof GuidelinesEvidenceSchema>;

/** Evidence from ICD diagnostic code lookup. */
export const IcdEvidenceSchema = DomainEvidenceSchema.extend({
  sourceType: z.literal("icd-code"),
  metadata: z.object({
    icdCode: z.string(),
    icdVersion: z.enum(["ICD-10", "ICD-11"]),
    description: z.string(),
    category: z.string(),
    inclusions: z.array(z.string()),
  }),
});
export type IcdEvidence = z.infer<typeof IcdEvidenceSchema>;

/** Evidence from evidence-grade classification (e.g. GRADE, Oxford). */
export const EvidenceGradeEvidenceSchema = DomainEvidenceSchema.extend({
  sourceType: z.literal("evidence-grade"),
  metadata: z.object({
    studyType: z.string(),
    gradeLevel: z.string(),
    sampleSize: z.number().int().positive().nullable(),
    pubmedId: z.string().nullable(),
    doi: z.string().nullable(),
    journal: z.string().nullable(),
    publicationYear: z.number().int().positive().nullable(),
  }),
});
export type EvidenceGradeEvidence = z.infer<typeof EvidenceGradeEvidenceSchema>;

/** Union of all medical evidence types. */
export type MedicalEvidence =
  | DrugDbEvidence
  | GuidelinesEvidence
  | IcdEvidence
  | EvidenceGradeEvidence;

/** Aggregate medical evidence result from all sources. */
export interface MedicalEvidenceResult {
  readonly claimId: string;
  readonly drugNames: ReadonlyArray<string>;
  readonly drugEvidence: ReadonlyArray<DrugDbEvidence>;
  readonly guidelinesEvidence: ReadonlyArray<GuidelinesEvidence>;
  readonly icdEvidence: ReadonlyArray<IcdEvidence>;
  readonly gradeEvidence: ReadonlyArray<EvidenceGradeEvidence>;
  readonly overallRelevance: number;
}

/** Build a MedicalEvidenceResult (pure, immutable). */
export function makeMedicalEvidenceResult(
  claimId: string,
  drugNames: ReadonlyArray<string>,
  drugEvidence: ReadonlyArray<DrugDbEvidence>,
  guidelinesEvidence: ReadonlyArray<GuidelinesEvidence>,
  icdEvidence: ReadonlyArray<IcdEvidence>,
  gradeEvidence: ReadonlyArray<EvidenceGradeEvidence>,
): MedicalEvidenceResult {
  const allScores = [
    ...drugEvidence.map((e) => e.relevanceScore),
    ...guidelinesEvidence.map((e) => e.relevanceScore),
    ...icdEvidence.map((e) => e.relevanceScore),
    ...gradeEvidence.map((e) => e.relevanceScore),
  ];
  const overallRelevance =
    allScores.length > 0
      ? allScores.reduce((a, b) => a + b, 0) / allScores.length
      : 0;
  return Object.freeze({
    claimId,
    drugNames: [...drugNames],
    drugEvidence: [...drugEvidence],
    guidelinesEvidence: [...guidelinesEvidence],
    icdEvidence: [...icdEvidence],
    gradeEvidence: [...gradeEvidence],
    overallRelevance,
  });
}
