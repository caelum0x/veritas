// Source political/quality bias profiles: port interface + in-memory mock registry.
import type { Result } from "@veritas/core";
import { ok, err } from "@veritas/core";
import { SourceBiasLookupError } from "./errors.js";

export type PoliticalLeaning =
  | "far-left"
  | "left"
  | "center-left"
  | "center"
  | "center-right"
  | "right"
  | "far-right"
  | "unknown";

export type FactualReportingTier =
  | "very-high"
  | "high"
  | "mixed"
  | "low"
  | "very-low"
  | "unknown";

export interface SourceBiasProfile {
  readonly sourceId: string;
  /** Canonical domain or publication name used as lookup key. */
  readonly domain: string;
  readonly politicalLeaning: PoliticalLeaning;
  /** Credibility score 0-1, higher = more credible. */
  readonly credibilityScore: number;
  readonly factualReporting: FactualReportingTier;
  readonly knownBiases: ReadonlyArray<string>;
  readonly lastReviewedAt: string; // ISO date
}

export interface SourceBiasPort {
  getProfile(domain: string): Promise<Result<SourceBiasProfile, SourceBiasLookupError>>;
  hasProfile(domain: string): Promise<boolean>;
}

/** Curated mock profiles for common news sources (for dev/test use). */
const MOCK_PROFILES: ReadonlyArray<SourceBiasProfile> = [
  {
    sourceId: "ap-news",
    domain: "apnews.com",
    politicalLeaning: "center",
    credibilityScore: 0.92,
    factualReporting: "very-high",
    knownBiases: [],
    lastReviewedAt: "2025-01-01",
  },
  {
    sourceId: "reuters",
    domain: "reuters.com",
    politicalLeaning: "center",
    credibilityScore: 0.93,
    factualReporting: "very-high",
    knownBiases: [],
    lastReviewedAt: "2025-01-01",
  },
  {
    sourceId: "fox-news",
    domain: "foxnews.com",
    politicalLeaning: "right",
    credibilityScore: 0.58,
    factualReporting: "mixed",
    knownBiases: ["pro-Republican framing", "conservative editorial slant"],
    lastReviewedAt: "2025-01-01",
  },
  {
    sourceId: "msnbc",
    domain: "msnbc.com",
    politicalLeaning: "left",
    credibilityScore: 0.62,
    factualReporting: "mixed",
    knownBiases: ["pro-Democrat framing", "progressive editorial slant"],
    lastReviewedAt: "2025-01-01",
  },
  {
    sourceId: "nyt",
    domain: "nytimes.com",
    politicalLeaning: "center-left",
    credibilityScore: 0.85,
    factualReporting: "high",
    knownBiases: ["center-left editorial page"],
    lastReviewedAt: "2025-01-01",
  },
  {
    sourceId: "wsj",
    domain: "wsj.com",
    politicalLeaning: "center-right",
    credibilityScore: 0.87,
    factualReporting: "high",
    knownBiases: ["center-right editorial page"],
    lastReviewedAt: "2025-01-01",
  },
  {
    sourceId: "breitbart",
    domain: "breitbart.com",
    politicalLeaning: "far-right",
    credibilityScore: 0.22,
    factualReporting: "low",
    knownBiases: ["far-right political agenda", "conspiracy promotion", "sensationalism"],
    lastReviewedAt: "2025-01-01",
  },
  {
    sourceId: "the-guardian",
    domain: "theguardian.com",
    politicalLeaning: "left",
    credibilityScore: 0.80,
    factualReporting: "high",
    knownBiases: ["progressive viewpoint"],
    lastReviewedAt: "2025-01-01",
  },
];

/** In-memory mock implementation backed by curated profiles. */
export class MockSourceBiasPort implements SourceBiasPort {
  readonly #byDomain: ReadonlyMap<string, SourceBiasProfile>;

  constructor(profiles: ReadonlyArray<SourceBiasProfile> = MOCK_PROFILES) {
    this.#byDomain = new Map(profiles.map((p) => [p.domain.toLowerCase(), p]));
  }

  async getProfile(domain: string): Promise<Result<SourceBiasProfile, SourceBiasLookupError>> {
    const normalized = domain.toLowerCase().replace(/^www\./, "");
    const profile = this.#byDomain.get(normalized);
    if (!profile) {
      return err(new SourceBiasLookupError(normalized));
    }
    return ok(profile);
  }

  async hasProfile(domain: string): Promise<boolean> {
    const normalized = domain.toLowerCase().replace(/^www\./, "");
    return this.#byDomain.has(normalized);
  }
}

export function createSourceBiasPort(): SourceBiasPort {
  return new MockSourceBiasPort();
}

/** Derive a bias score contribution (0-1) from a source profile. */
export function sourceBiasContribution(profile: SourceBiasProfile): number {
  const leaningWeight: Record<PoliticalLeaning, number> = {
    "far-left": 0.9,
    "left": 0.6,
    "center-left": 0.3,
    "center": 0.0,
    "center-right": 0.3,
    "right": 0.6,
    "far-right": 0.9,
    "unknown": 0.2,
  };
  const credibilityPenalty = 1 - profile.credibilityScore;
  const leaning = leaningWeight[profile.politicalLeaning];
  return Math.min(1, (leaning + credibilityPenalty) / 2);
}
