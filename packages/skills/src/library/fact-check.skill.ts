// Built-in fact-check skill: verifies a claim against a provided body of evidence.
import { ok, err, type Result } from "@veritas/core";
import { defineSkill, type Skill } from "../skill.js";
import { SkillInvocationError, SkillValidationError } from "../errors.js";
import { type SkillResult } from "../types.js";

const SKILL_ID = "veritas.fact-check";

type FactCheckError = SkillInvocationError | SkillValidationError;

function assessEvidence(claim: string, evidence: string[]): SkillResult {
  const lowerClaim = claim.toLowerCase();
  const joined = evidence.map((e) => e.toLowerCase()).join(" ");

  const claimWords = lowerClaim
    .split(/\s+/)
    .filter((w) => w.length > 4);

  const matchCount = claimWords.filter((w) => joined.includes(w)).length;
  const confidence = claimWords.length > 0
    ? Math.min(1, matchCount / claimWords.length)
    : 0;

  const verdict: string =
    confidence >= 0.7
      ? "SUPPORTED"
      : confidence >= 0.4
      ? "INCONCLUSIVE"
      : "REFUTED";

  return Object.freeze({
    verdict,
    confidence,
    matchedTerms: matchCount,
    totalTerms: claimWords.length,
    summary: `Claim is ${verdict.toLowerCase()} based on ${matchCount}/${claimWords.length} matched terms across ${evidence.length} evidence item(s).`,
  });
}

const handler = async (
  input: Record<string, unknown>,
): Promise<Result<SkillResult, FactCheckError>> => {
  const { claim, evidence } = input as {
    claim?: unknown;
    evidence?: unknown;
  };

  if (typeof claim !== "string" || claim.trim().length === 0) {
    return err(
      new SkillValidationError("'claim' must be a non-empty string"),
    );
  }

  if (!Array.isArray(evidence) || evidence.some((e) => typeof e !== "string")) {
    return err(
      new SkillValidationError("'evidence' must be an array of strings"),
    );
  }

  try {
    const result = assessEvidence(claim.trim(), evidence as string[]);
    return ok(result);
  } catch (cause) {
    return err(new SkillInvocationError(SKILL_ID, cause));
  }
};

export const factCheckSkill: Skill = defineSkill(
  {
    id: SKILL_ID,
    name: "Fact Check",
    version: "1.0.0",
    description:
      "Verifies a textual claim against one or more evidence strings and returns a structured verdict.",
    category: "verification",
    parameters: [
      {
        name: "claim",
        type: "string",
        description: "The claim to be fact-checked.",
        required: true,
      },
      {
        name: "evidence",
        type: "array",
        description: "Array of evidence strings to evaluate the claim against.",
        required: true,
      },
    ],
    output: {
      type: "object",
      description:
        "Verdict object containing verdict, confidence score, matched terms, and a human-readable summary.",
    },
    tags: ["fact-check", "verification", "claim"],
    deprecated: false,
  },
  handler,
);

export default factCheckSkill;
