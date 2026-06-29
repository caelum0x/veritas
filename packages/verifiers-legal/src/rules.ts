// Legal heuristic rules: validate legal claims against statute, case law, and jurisdiction data.
import { asScore, clampScore, type Verdict } from "@veritas/core";
import type {
  ParsedLegalClaim,
  StatuteRecord,
  CaseLawRecord,
  JurisdictionRecord,
  LegalRuleResult,
} from "./types.js";

const VERIFIER_ID = "legal-rules";

function verdictFromMatch(match: boolean, hasData: boolean): Verdict {
  if (!hasData) return "UNVERIFIABLE";
  return match ? "SUPPORTED" : "REFUTED";
}

/** Rule: statute citation resolves to an active (non-repealed) statute. */
export function checkStatuteActive(
  claim: ParsedLegalClaim,
  statute: StatuteRecord,
): LegalRuleResult {
  const isActive = statute.status === "active";
  const score = isActive ? 1.0 : statute.status === "amended" ? 0.6 : 0.1;

  return {
    ruleId: "statute-active",
    passed: isActive,
    score: asScore(score),
    verdict: isActive ? "SUPPORTED" : "REFUTED",
    rationale: isActive
      ? `Statute "${statute.citation}" is active and in force.`
      : `Statute "${statute.citation}" has status "${statute.status}" — not currently in force.`,
    details: { citation: statute.citation, status: statute.status, claimId: claim.claimId },
  };
}

/** Rule: case citation is not overruled by a later decision. */
export function checkCaseNotOverruled(
  claim: ParsedLegalClaim,
  caseRecord: CaseLawRecord,
): LegalRuleResult {
  const valid = !caseRecord.isOverruled;
  const score = valid ? 1.0 : 0.05;

  return {
    ruleId: "case-not-overruled",
    passed: valid,
    score: asScore(score),
    verdict: verdictFromMatch(valid, true),
    rationale: valid
      ? `Case "${caseRecord.caseName}" (${caseRecord.citation}) remains good law.`
      : `Case "${caseRecord.caseName}" (${caseRecord.citation}) has been overruled${caseRecord.overruledBy ? ` by ${caseRecord.overruledBy}` : ""}.`,
    details: {
      citation: caseRecord.citation,
      isOverruled: caseRecord.isOverruled,
      overruledBy: caseRecord.overruledBy,
      claimId: claim.claimId,
    },
  };
}

/** Rule: claim jurisdiction is consistent with the jurisdiction record. */
export function checkJurisdictionMatch(
  claim: ParsedLegalClaim,
  jurisdiction: JurisdictionRecord,
): LegalRuleResult {
  const levelMatch = claim.jurisdictionLevel === jurisdiction.level;
  const nameMatch =
    !claim.jurisdictionName ||
    jurisdiction.name.toLowerCase().includes(claim.jurisdictionName.toLowerCase()) ||
    jurisdiction.code.toLowerCase() === claim.jurisdictionName.toLowerCase();
  const passed = levelMatch && nameMatch;
  const score = passed ? 1.0 : levelMatch || nameMatch ? 0.5 : 0.2;

  return {
    ruleId: "jurisdiction-match",
    passed,
    score: asScore(score),
    verdict: verdictFromMatch(passed, true),
    rationale: passed
      ? `Jurisdiction "${jurisdiction.name}" (${jurisdiction.level}) matches claim context.`
      : `Jurisdiction mismatch: claim specifies "${claim.jurisdictionName ?? claim.jurisdictionLevel}" but source is "${jurisdiction.name}" (${jurisdiction.level}).`,
    details: {
      claimJurisdictionLevel: claim.jurisdictionLevel,
      claimJurisdictionName: claim.jurisdictionName,
      sourceCode: jurisdiction.code,
      sourceName: jurisdiction.name,
      sourceLevel: jurisdiction.level,
    },
  };
}

/** Rule: statute effective year aligns with the claim's stated year. */
export function checkStatuteYearAlignment(
  claim: ParsedLegalClaim,
  statute: StatuteRecord,
): LegalRuleResult {
  if (!claim.effectiveYear) {
    return {
      ruleId: "statute-year-alignment",
      passed: true,
      score: asScore(0.5),
      verdict: "UNVERIFIABLE",
      rationale: "No effective year specified in claim; skipping year alignment check.",
    };
  }

  const enactedYear = statute.enactedYear;
  if (!enactedYear) {
    return {
      ruleId: "statute-year-alignment",
      passed: false,
      score: asScore(0.4),
      verdict: "UNVERIFIABLE",
      rationale: `Statute "${statute.citation}" has no enacted year in the source record.`,
    };
  }

  const aligned = claim.effectiveYear >= enactedYear;
  const score = aligned ? 0.9 : 0.2;

  return {
    ruleId: "statute-year-alignment",
    passed: aligned,
    score: asScore(score),
    verdict: aligned ? "SUPPORTED" : "REFUTED",
    rationale: aligned
      ? `Claim year ${claim.effectiveYear} is on or after statute enacted year ${enactedYear}.`
      : `Claim year ${claim.effectiveYear} predates statute enacted year ${enactedYear}.`,
    details: { claimYear: claim.effectiveYear, enactedYear },
  };
}

/** Rule: case law court year is plausible for the claim's cited year. */
export function checkCaseYearConsistency(
  claim: ParsedLegalClaim,
  caseRecord: CaseLawRecord,
): LegalRuleResult {
  if (!claim.effectiveYear) {
    return {
      ruleId: "case-year-consistency",
      passed: true,
      score: asScore(0.5),
      verdict: "UNVERIFIABLE",
      rationale: "No effective year in claim; skipping case year consistency check.",
    };
  }

  const yearMatch = Math.abs(claim.effectiveYear - caseRecord.decidedYear) <= 1;
  const score = yearMatch ? 1.0 : Math.max(0, 0.7 - Math.abs(claim.effectiveYear - caseRecord.decidedYear) * 0.05);

  return {
    ruleId: "case-year-consistency",
    passed: yearMatch,
    score: asScore(clampScore(score)),
    verdict: yearMatch ? "SUPPORTED" : "UNVERIFIABLE",
    rationale: yearMatch
      ? `Claim year ${claim.effectiveYear} matches case decided year ${caseRecord.decidedYear}.`
      : `Claim year ${claim.effectiveYear} differs from case decided year ${caseRecord.decidedYear}.`,
    details: { claimYear: claim.effectiveYear, decidedYear: caseRecord.decidedYear },
  };
}

/** Run all applicable legal rules given available source data. */
export function applyLegalRules(
  claim: ParsedLegalClaim,
  statute: StatuteRecord | undefined,
  caseRecord: CaseLawRecord | undefined,
  jurisdiction: JurisdictionRecord | undefined,
): ReadonlyArray<LegalRuleResult> {
  const results: LegalRuleResult[] = [];

  if (statute) {
    results.push(
      checkStatuteActive(claim, statute),
      checkStatuteYearAlignment(claim, statute),
    );
  }

  if (caseRecord) {
    results.push(
      checkCaseNotOverruled(claim, caseRecord),
      checkCaseYearConsistency(claim, caseRecord),
    );
  }

  if (jurisdiction) {
    results.push(checkJurisdictionMatch(claim, jurisdiction));
  }

  if (results.length === 0) {
    results.push({
      ruleId: "no-legal-data-available",
      passed: false,
      score: asScore(0.1),
      verdict: "UNVERIFIABLE",
      rationale: `No authoritative legal data available for claim "${claim.claimId}".`,
    });
  }

  return Object.freeze(results);
}

export { VERIFIER_ID };
