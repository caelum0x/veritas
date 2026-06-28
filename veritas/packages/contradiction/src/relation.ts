// Natural-language inference relation types: entailment, contradiction, neutral.
export type NliRelation = "entailment" | "contradiction" | "neutral";

export interface NliScore {
  readonly relation: NliRelation;
  /** Confidence in [0,1] */
  readonly confidence: number;
  /** Raw scores per class, if available */
  readonly scores?: {
    readonly entailment: number;
    readonly contradiction: number;
    readonly neutral: number;
  };
}

export function isContradiction(score: NliScore): boolean {
  return score.relation === "contradiction";
}

export function isEntailment(score: NliScore): boolean {
  return score.relation === "entailment";
}

export function isNeutral(score: NliScore): boolean {
  return score.relation === "neutral";
}

/** Return the dominant relation from raw probability scores */
export function dominantRelation(scores: {
  entailment: number;
  contradiction: number;
  neutral: number;
}): NliRelation {
  const entries = [
    ["entailment", scores.entailment],
    ["contradiction", scores.contradiction],
    ["neutral", scores.neutral],
  ] as const;
  const best = entries.reduce((a, b) => (b[1] > a[1] ? b : a));
  return best[0];
}

/** Build an NliScore from raw class probabilities */
export function fromScores(scores: {
  entailment: number;
  contradiction: number;
  neutral: number;
}): NliScore {
  const relation = dominantRelation(scores);
  const confidence =
    relation === "entailment"
      ? scores.entailment
      : relation === "contradiction"
        ? scores.contradiction
        : scores.neutral;
  return { relation, confidence, scores };
}
