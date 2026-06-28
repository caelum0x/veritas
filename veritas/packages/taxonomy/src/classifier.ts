// Classifies a raw claim string into its type and domain using lexical heuristics.
import { ClaimType } from "./claim-type.js";
import { Domain } from "./domain.js";
import { extractFeatures } from "./features.js";
import { scoreClaimTypes, scoreDomains, pickBest } from "./rules.js";

export interface ClassificationResult {
  readonly type: ClaimType;
  readonly domain: Domain;
  readonly typeScore: number;
  readonly domainScore: number;
}

export interface Classifier {
  classify(claimText: string): ClassificationResult;
}

function buildResult(
  claimText: string
): ClassificationResult {
  const features = extractFeatures(claimText);
  const typeScores = scoreClaimTypes(features);
  const domainScores = scoreDomains(features);

  const bestType = pickBest(typeScores);
  const bestDomain = pickBest(domainScores);

  return {
    type: bestType.type,
    domain: bestDomain.domain,
    typeScore: bestType.score,
    domainScore: bestDomain.score,
  };
}

export function createHeuristicClassifier(): Classifier {
  return {
    classify(claimText: string): ClassificationResult {
      if (typeof claimText !== "string" || claimText.trim().length === 0) {
        return {
          type: ClaimType.Event,
          domain: Domain.General,
          typeScore: 0,
          domainScore: 0,
        };
      }
      return buildResult(claimText);
    },
  };
}

export const defaultClassifier: Classifier = createHeuristicClassifier();

export function classify(claimText: string): ClassificationResult {
  return defaultClassifier.classify(claimText);
}
