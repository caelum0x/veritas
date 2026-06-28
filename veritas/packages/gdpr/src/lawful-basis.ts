// Lawful basis: enumerate GDPR Article 6 bases and validate processing activities against them.

import { z } from "zod";
import { type Result, ok, err } from "@veritas/core";

export const LawfulBasisCodeSchema = z.enum([
  "consent",           // Art. 6(1)(a)
  "contract",          // Art. 6(1)(b)
  "legal_obligation",  // Art. 6(1)(c)
  "vital_interests",   // Art. 6(1)(d)
  "public_task",       // Art. 6(1)(e)
  "legitimate_interests", // Art. 6(1)(f)
]);
export type LawfulBasisCode = z.infer<typeof LawfulBasisCodeSchema>;

export const LawfulBasisSchema = z.object({
  code: LawfulBasisCodeSchema,
  article: z.string(),
  description: z.string(),
  requiresConsentRecord: z.boolean(),
  requiresLegitimateInterestAssessment: z.boolean(),
});
export type LawfulBasis = z.infer<typeof LawfulBasisSchema>;

/** Canonical definitions for each GDPR Art. 6 lawful basis. */
export const LAWFUL_BASES: Readonly<Record<LawfulBasisCode, LawfulBasis>> = {
  consent: {
    code: "consent",
    article: "Art. 6(1)(a)",
    description: "The data subject has given consent to the processing of their personal data.",
    requiresConsentRecord: true,
    requiresLegitimateInterestAssessment: false,
  },
  contract: {
    code: "contract",
    article: "Art. 6(1)(b)",
    description: "Processing is necessary for a contract with the data subject.",
    requiresConsentRecord: false,
    requiresLegitimateInterestAssessment: false,
  },
  legal_obligation: {
    code: "legal_obligation",
    article: "Art. 6(1)(c)",
    description: "Processing is necessary for compliance with a legal obligation.",
    requiresConsentRecord: false,
    requiresLegitimateInterestAssessment: false,
  },
  vital_interests: {
    code: "vital_interests",
    article: "Art. 6(1)(d)",
    description: "Processing is necessary to protect the vital interests of the data subject.",
    requiresConsentRecord: false,
    requiresLegitimateInterestAssessment: false,
  },
  public_task: {
    code: "public_task",
    article: "Art. 6(1)(e)",
    description: "Processing is necessary for a task carried out in the public interest.",
    requiresConsentRecord: false,
    requiresLegitimateInterestAssessment: false,
  },
  legitimate_interests: {
    code: "legitimate_interests",
    article: "Art. 6(1)(f)",
    description: "Processing is necessary for the legitimate interests of the controller.",
    requiresConsentRecord: false,
    requiresLegitimateInterestAssessment: true,
  },
};

export interface ProcessingActivity {
  readonly name: string;
  readonly lawfulBasis: LawfulBasisCode;
  readonly hasConsentRecord?: boolean;
  readonly hasLiaCompleted?: boolean;
}

export interface LawfulBasisValidationResult {
  readonly valid: boolean;
  readonly basis: LawfulBasis;
  readonly issues: readonly string[];
}

/** Validate a processing activity against its declared lawful basis. */
export function validateLawfulBasis(activity: ProcessingActivity): Result<LawfulBasisValidationResult> {
  const basisCode = LawfulBasisCodeSchema.safeParse(activity.lawfulBasis);
  if (!basisCode.success) {
    return err(new Error(`Unknown lawful basis: ${activity.lawfulBasis}`));
  }

  const basis = LAWFUL_BASES[basisCode.data];
  const issues: string[] = [];

  if (basis.requiresConsentRecord && !activity.hasConsentRecord) {
    issues.push(`Basis '${basis.code}' requires a documented consent record but none was found.`);
  }

  if (basis.requiresLegitimateInterestAssessment && !activity.hasLiaCompleted) {
    issues.push(`Basis '${basis.code}' requires a Legitimate Interests Assessment (LIA) to be completed.`);
  }

  return ok({ valid: issues.length === 0, basis, issues });
}

/** Return the lawful basis definition for a given code. */
export function getLawfulBasis(code: LawfulBasisCode): LawfulBasis {
  return LAWFUL_BASES[code];
}

/** List all available lawful bases. */
export function listLawfulBases(): LawfulBasis[] {
  return Object.values(LAWFUL_BASES);
}
