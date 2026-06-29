// DLP scanner: scans arbitrary string payloads for PII and secrets using patterns + entropy
import { type Result, ok } from "@veritas/core";
import { PII_PATTERNS, type PiiPattern } from "./patterns.js";
import { looksLikeSecret } from "./entropy.js";
import { type Finding, type FindingType, type Severity, makeFinding } from "./finding.js";
import { maskValue, defaultStrategyFor } from "./masking.js";
import { type DlpPolicy, resolveAction } from "./policy.js";
import { DlpScanError } from "./errors.js";

export interface ScanField {
  readonly name: string;
  readonly value: string;
}

export interface ScanInput {
  readonly fields: readonly ScanField[];
  readonly policyId?: string;
}

export interface ScanResult {
  readonly findings: readonly Finding[];
  readonly blocked: boolean;
  readonly sanitized: Readonly<Record<string, string>>;
}

function categoryToFindingType(category: PiiPattern["category"]): FindingType {
  switch (category) {
    case "email": return "EMAIL";
    case "ssn": return "SSN";
    case "card": return "CREDIT_CARD";
    case "phone": return "PHONE";
    default: return "CUSTOM";
  }
}

function severityForType(type: FindingType): Severity {
  switch (type) {
    case "SSN":
    case "CREDIT_CARD":
      return "CRITICAL";
    case "SECRET_ENTROPY":
      return "HIGH";
    case "EMAIL":
    case "PHONE":
      return "MEDIUM";
    default:
      return "LOW";
  }
}

function scanFieldWithPattern(
  field: ScanField,
  pattern: PiiPattern,
  policyId?: string,
): Finding[] {
  const findings: Finding[] = [];
  const regex = new RegExp(pattern.regex.source, "gi");
  let match: RegExpExecArray | null;
  while ((match = regex.exec(field.value)) !== null) {
    const matched = match[0];
    const type = categoryToFindingType(pattern.category);
    const severity = severityForType(type);
    const masked = maskValue(matched, defaultStrategyFor(type));
    findings.push(
      makeFinding(type, severity, field.name, match.index, matched.length, masked, policyId),
    );
  }
  return findings;
}

function scanFieldForSecrets(field: ScanField, policyId?: string): Finding[] {
  const findings: Finding[] = [];
  const tokens = field.value.split(/\s+/);
  let offset = 0;
  for (const token of tokens) {
    if (looksLikeSecret(token)) {
      const masked = maskValue(token, defaultStrategyFor("SECRET_ENTROPY"));
      findings.push(
        makeFinding("SECRET_ENTROPY", "HIGH", field.name, offset, token.length, masked, policyId),
      );
    }
    offset += token.length + 1;
  }
  return findings;
}

export function scanPayload(
  input: ScanInput,
  policy?: DlpPolicy,
): Result<ScanResult, DlpScanError> {
  const allFindings: Finding[] = [];

  for (const field of input.fields) {
    if (typeof field.value !== "string") continue;

    for (const pattern of PII_PATTERNS) {
      const found = scanFieldWithPattern(field, pattern, input.policyId);
      allFindings.push(...found);
    }

    const secretFindings = scanFieldForSecrets(field, input.policyId);
    allFindings.push(...secretFindings);
  }

  let blocked = false;
  if (policy) {
    for (const finding of allFindings) {
      const action = resolveAction(policy, finding.type, finding.severity);
      if (action === "BLOCK") {
        blocked = true;
        break;
      }
    }
  }

  const sanitized: Record<string, string> = {};
  for (const field of input.fields) {
    let sanitizedValue = field.value;
    const fieldFindings = allFindings
      .filter((f) => f.field === field.name)
      .sort((a, b) => b.offset - a.offset);

    for (const finding of fieldFindings) {
      sanitizedValue =
        sanitizedValue.slice(0, finding.offset) +
        finding.redacted +
        sanitizedValue.slice(finding.offset + finding.length);
    }
    sanitized[field.name] = sanitizedValue;
  }

  return ok({ findings: allFindings, blocked, sanitized });
}
