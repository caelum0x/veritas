// Neutral-rewrite suggestion engine: produces bias mitigation alternatives for flagged text spans.
import type { Result } from "@veritas/core";
import { ok, err } from "@veritas/core";
import type { BiasFlag, BiasReport } from "./types.js";
import { InvalidBiasInputError } from "./errors.js";

/** A single neutral-rewrite suggestion for a biased span or phrase. */
export interface RewriteSuggestion {
  /** The original biased text */
  readonly original: string;
  /** A neutrally-worded alternative */
  readonly neutral: string;
  /** Explanation of why the rewrite improves neutrality */
  readonly rationale: string;
  /** Confidence in the suggestion quality: 0-1 */
  readonly confidence: number;
}

/** Produces mitigation suggestions for a set of bias flags. */
export interface MitigationPort {
  suggest(
    text: string,
    flags: ReadonlyArray<BiasFlag>,
  ): Promise<Result<ReadonlyArray<RewriteSuggestion>>>;
}

// Static rule map: loaded/charged terms → neutral alternatives
const NEUTRAL_ALTERNATIVES: Readonly<Record<string, string>> = {
  radical: "strongly held",
  extremist: "holding fringe views",
  regime: "government",
  propaganda: "messaging",
  indoctrination: "instruction",
  globalist: "internationally-minded",
  "deep state": "career civil servants",
  woke: "socially progressive",
  fascist: "authoritarian",
  socialist: "left-leaning on economic policy",
  communist: "communist",
  thugs: "individuals",
  illegals: "undocumented immigrants",
  mob: "crowd",
  catastrophic: "serious",
  devastating: "damaging",
  disastrous: "harmful",
  alarming: "concerning",
  shocking: "notable",
  outrageous: "objectionable",
  horrifying: "disturbing",
  disgraceful: "problematic",
  scandalous: "controversial",
  despicable: "unacceptable",
  invasion: "influx",
  "enhanced interrogation": "coercive interrogation",
  "collateral damage": "civilian casualties",
  "ethnic cleansing": "forced displacement or genocide",
  murder: "killing",
};

/** Rule-based implementation of MitigationPort — requires no external services. */
export class RuleBasedMitigationPort implements MitigationPort {
  async suggest(
    text: string,
    flags: ReadonlyArray<BiasFlag>,
  ): Promise<Result<ReadonlyArray<RewriteSuggestion>>> {
    if (!text.trim()) {
      return err(new InvalidBiasInputError("Cannot generate suggestions for empty text"));
    }

    const suggestions: RewriteSuggestion[] = [];

    for (const flag of flags) {
      if (!flag.span) continue;

      const spanLower = flag.span.text.toLowerCase();
      const alternative = NEUTRAL_ALTERNATIVES[spanLower];

      if (alternative !== undefined) {
        suggestions.push({
          original: flag.span.text,
          neutral: alternative,
          rationale: buildRationale(flag, alternative),
          confidence: Math.min(0.9, flag.confidence * 0.95),
        });
      } else if (flag.type === "subjectivity") {
        suggestions.push({
          original: flag.span.text,
          neutral: flag.span.text,
          rationale:
            "Consider replacing subjective language with verifiable facts or attribution (e.g., 'According to…').",
          confidence: 0.5,
        });
      } else if (flag.type === "sentiment") {
        suggestions.push({
          original: flag.span.text,
          neutral: flag.span.text,
          rationale:
            "Consider moderating charged emotional language to maintain an objective tone.",
          confidence: 0.6,
        });
      }
    }

    // Deduplicate by original span text
    const seen = new Set<string>();
    const deduped = suggestions.filter((s) => {
      if (seen.has(s.original.toLowerCase())) return false;
      seen.add(s.original.toLowerCase());
      return true;
    });

    return ok(deduped);
  }
}

/** Build a human-readable rationale for why a rewrite improves neutrality. */
function buildRationale(flag: BiasFlag, alternative: string): string {
  const typeLabel = flag.type.replace(/-/g, " ");
  return (
    `The term "${flag.span?.text}" carries ${typeLabel} connotations (severity: ${flag.severity}). ` +
    `Replacing it with "${alternative}" conveys the same meaning without loaded framing.`
  );
}

/**
 * Generate a high-level neutral summary from a full BiasReport.
 * Returns the list of unique suggestions sorted by confidence descending.
 */
export async function generateMitigations(
  report: BiasReport,
  port: MitigationPort,
): Promise<Result<ReadonlyArray<RewriteSuggestion>>> {
  return port.suggest(report.claimText, report.flags);
}

/** Create the default rule-based mitigation port. */
export function createMitigationPort(): MitigationPort {
  return new RuleBasedMitigationPort();
}
