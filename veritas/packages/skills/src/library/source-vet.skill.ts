// Built-in source-vetting skill: evaluates a source URL for credibility signals.
import { ok, err, type Result } from "@veritas/core";
import { defineSkill, type Skill } from "../skill.js";
import { SkillInvocationError, SkillValidationError } from "../errors.js";
import { type SkillResult } from "../types.js";

const SKILL_ID = "veritas.source-vet";

type SourceVetError = SkillInvocationError | SkillValidationError;

const HIGH_TRUST_TLDS = new Set([".gov", ".edu", ".mil"]);

const KNOWN_REPUTABLE_DOMAINS: readonly string[] = [
  "reuters.com",
  "apnews.com",
  "bbc.com",
  "bbc.co.uk",
  "theguardian.com",
  "nytimes.com",
  "washingtonpost.com",
  "nature.com",
  "science.org",
  "nejm.org",
  "pubmed.ncbi.nlm.nih.gov",
  "who.int",
  "cdc.gov",
  "fda.gov",
];

const KNOWN_LOW_TRUST_DOMAINS: readonly string[] = [
  "infowars.com",
  "naturalnews.com",
  "beforeitsnews.com",
  "worldnewsdailyreport.com",
];

function extractDomain(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function getTld(hostname: string): string {
  const parts = hostname.split(".");
  return parts.length >= 2 ? `.${parts[parts.length - 1]}` : "";
}

function vetSource(url: string, description?: string): SkillResult {
  const domain = extractDomain(url);

  if (!domain) {
    return Object.freeze({
      trustScore: 0,
      tier: "unknown",
      signals: ["invalid-url"],
      summary: "URL could not be parsed; source is untrusted.",
    });
  }

  const signals: string[] = [];
  let score = 0.5; // neutral baseline

  const tld = getTld(domain);
  if (HIGH_TRUST_TLDS.has(tld)) {
    score += 0.3;
    signals.push("high-trust-tld");
  }

  if (KNOWN_REPUTABLE_DOMAINS.includes(domain)) {
    score += 0.25;
    signals.push("known-reputable-domain");
  }

  if (KNOWN_LOW_TRUST_DOMAINS.includes(domain)) {
    score -= 0.5;
    signals.push("known-low-trust-domain");
  }

  const https = url.startsWith("https://");
  if (https) {
    score += 0.05;
    signals.push("https");
  } else {
    score -= 0.1;
    signals.push("no-https");
  }

  if (description && description.trim().length > 0) {
    signals.push("has-description");
  }

  const finalScore = Math.max(0, Math.min(1, score));

  const tier: string =
    finalScore >= 0.75
      ? "high"
      : finalScore >= 0.5
      ? "medium"
      : finalScore >= 0.25
      ? "low"
      : "untrusted";

  return Object.freeze({
    domain,
    trustScore: Math.round(finalScore * 100) / 100,
    tier,
    signals,
    summary: `Source '${domain}' rated as ${tier} trust (score: ${(finalScore * 100).toFixed(0)}%) based on signals: ${signals.join(", ")}.`,
  });
}

const handler = async (
  input: Record<string, unknown>,
): Promise<Result<SkillResult, SourceVetError>> => {
  const { url, description } = input as {
    url?: unknown;
    description?: unknown;
  };

  if (typeof url !== "string" || url.trim().length === 0) {
    return err(
      new SkillValidationError("'url' must be a non-empty string"),
    );
  }

  if (description !== undefined && typeof description !== "string") {
    return err(
      new SkillValidationError("'description' must be a string if provided"),
    );
  }

  try {
    const result = vetSource(url.trim(), description as string | undefined);
    return ok(result);
  } catch (cause) {
    return err(new SkillInvocationError(SKILL_ID, cause));
  }
};

export const sourceVetSkill: Skill = defineSkill(
  {
    id: SKILL_ID,
    name: "Source Vet",
    version: "1.0.0",
    description:
      "Evaluates a source URL for credibility signals and returns a structured trust score and tier.",
    category: "sourcing",
    parameters: [
      {
        name: "url",
        type: "string",
        description: "The source URL to evaluate.",
        required: true,
      },
      {
        name: "description",
        type: "string",
        description: "Optional human-readable description of the source.",
        required: false,
      },
    ],
    output: {
      type: "object",
      description:
        "Trust assessment object containing domain, trustScore, tier, signals array, and a human-readable summary.",
    },
    tags: ["source", "trust", "provenance", "vetting"],
    deprecated: false,
  },
  handler,
);

export default sourceVetSkill;
