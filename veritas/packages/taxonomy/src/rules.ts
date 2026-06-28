// Classification heuristic rules mapping claim features to type and domain scores.
import { ClaimType } from "./claim-type.js";
import { Domain } from "./domain.js";
import type { ClaimFeatures } from "./features.js";

export interface TypeScore {
  readonly type: ClaimType;
  readonly score: number;
}

export interface DomainScore {
  readonly domain: Domain;
  readonly score: number;
}

export function scoreClaimTypes(f: ClaimFeatures): readonly TypeScore[] {
  const scores: TypeScore[] = [
    {
      type: ClaimType.Statistical,
      score:
        (f.hasNumbers ? 2 : 0) +
        (f.hasPercent ? 2 : 0) +
        (f.hasCurrency ? 1 : 0) +
        (f.hasComparisonKeyword ? 1 : 0),
    },
    {
      type: ClaimType.Causal,
      score: (f.hasCausalKeyword ? 3 : 0) + (f.hasNumbers ? 1 : 0),
    },
    {
      type: ClaimType.Definitional,
      score: (f.hasDefinitionalKeyword ? 3 : 0),
    },
    {
      type: ClaimType.Predictive,
      score:
        (f.hasPredictiveKeyword ? 3 : 0) +
        (f.hasNumbers ? 1 : 0) +
        (f.hasDate ? 1 : 0),
    },
    {
      type: ClaimType.Quote,
      score: (f.hasQuotation ? 4 : 0),
    },
    {
      type: ClaimType.Event,
      score:
        (f.hasEventKeyword ? 3 : 0) +
        (f.hasDate ? 1 : 0) +
        (f.hasNewsKeyword ? 1 : 0),
    },
    {
      type: ClaimType.Comparative,
      score:
        (f.hasComparisonKeyword ? 4 : 0) +
        (f.hasNumbers ? 1 : 0),
    },
  ];

  return scores.sort((a, b) => b.score - a.score);
}

export function scoreDomains(f: ClaimFeatures): readonly DomainScore[] {
  const scores: DomainScore[] = [
    {
      domain: Domain.Financial,
      score:
        (f.hasFinancialKeyword ? 4 : 0) +
        (f.hasCurrency ? 2 : 0) +
        (f.hasNumbers ? 1 : 0),
    },
    {
      domain: Domain.Scientific,
      score:
        (f.hasScientificKeyword ? 4 : 0) +
        (f.hasNumbers ? 1 : 0),
    },
    {
      domain: Domain.Medical,
      score:
        (f.hasMedicalKeyword ? 4 : 0) +
        (f.hasScientificKeyword ? 1 : 0),
    },
    {
      domain: Domain.News,
      score:
        (f.hasNewsKeyword ? 3 : 0) +
        (f.hasEventKeyword ? 2 : 0) +
        (f.hasDate ? 1 : 0),
    },
    {
      domain: Domain.Crypto,
      score:
        (f.hasCryptoKeyword ? 4 : 0) +
        (f.hasCurrency ? 1 : 0),
    },
    {
      domain: Domain.Legal,
      score: (f.hasLegalKeyword ? 4 : 0),
    },
    {
      domain: Domain.General,
      score: 1,
    },
  ];

  return scores.sort((a, b) => b.score - a.score);
}

export function pickBest<T extends { score: number }>(
  scores: readonly T[],
  minScore: number = 0
): T {
  const best = scores[0];
  if (best === undefined) {
    throw new Error("scores array must not be empty");
  }
  if (best.score <= minScore && scores.length > 1) {
    return scores[scores.length - 1]!;
  }
  return best;
}
