// Medical verifier domain types: claim classification, drug/ICD references, evidence grades.
import { z } from "zod";

/** Recognized sub-domains of a medical claim. */
export const MedicalClaimDomainSchema = z.enum([
  "drug_efficacy",
  "drug_safety",
  "diagnosis",
  "treatment_guideline",
  "clinical_trial",
  "epidemiology",
  "medical_device",
  "general_medical",
]);
export type MedicalClaimDomain = z.infer<typeof MedicalClaimDomainSchema>;

/** Evidence grading systems used in clinical medicine. */
export const EvidenceGradeSchema = z.enum(["I", "II", "III", "IV", "V"]);
export type EvidenceGrade = z.infer<typeof EvidenceGradeSchema>;

/** ICD-10/11 code reference. */
export const IcdCodeSchema = z.object({
  code: z.string().min(1),
  description: z.string().min(1),
  version: z.enum(["ICD-10", "ICD-11"]),
});
export type IcdCode = z.infer<typeof IcdCodeSchema>;

/** Resolved drug entry from the drug database. */
export const DrugEntrySchema = z.object({
  genericName: z.string().min(1),
  brandNames: z.array(z.string()),
  drugClass: z.string().min(1),
  approvalStatus: z.enum(["approved", "investigational", "withdrawn", "not_approved"]),
  indications: z.array(z.string()),
  contraindications: z.array(z.string()),
  fdaLabel: z.string().nullable(),
});
export type DrugEntry = z.infer<typeof DrugEntrySchema>;

/** Clinical guideline reference. */
export const GuidelineSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  issuingBody: z.string().min(1),
  publicationYear: z.number().int().positive(),
  recommendation: z.string().min(1),
  evidenceGrade: EvidenceGradeSchema,
  url: z.string().url(),
});
export type Guideline = z.infer<typeof GuidelineSchema>;

/** Extracted structured facts from a medical claim. */
export interface MedicalClaimFacts {
  readonly domain: MedicalClaimDomain;
  readonly drugNames: readonly string[];
  readonly conditionNames: readonly string[];
  readonly treatmentNames: readonly string[];
  readonly statisticalClaims: readonly string[];
  readonly authorityReferences: readonly string[];
}

/** Aggregated per-source medical evidence. */
export interface MedicalEvidenceSummary {
  readonly matchedDrugs: readonly DrugEntry[];
  readonly matchedGuidelines: readonly Guideline[];
  readonly matchedIcdCodes: readonly IcdCode[];
  readonly evidenceGrade: EvidenceGrade | null;
  readonly supportingSourceCount: number;
  readonly refutingSourceCount: number;
}
