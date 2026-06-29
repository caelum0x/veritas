// seed.ts — inserts representative demo data so the dev server has something to explore.

import type { Logger } from "@veritas/observability";
import { InMemoryEventBus } from "@veritas/core";
import { newClaimId, newSourceId, newUserId, newVerificationId } from "@veritas/core";

export interface SeedDeps {
  readonly logger: Logger;
  readonly eventBus: InMemoryEventBus;
}

export interface SeedResult {
  readonly userIds: readonly string[];
  readonly claimIds: readonly string[];
  readonly sourceIds: readonly string[];
  readonly verificationIds: readonly string[];
}

/** Populates in-memory repositories with a small demo dataset. */
export async function seedDemoData(deps: SeedDeps): Promise<SeedResult> {
  const { logger } = deps;

  logger.info("Seeding demo data...");

  const userIds = [newUserId(), newUserId()] as const;
  const sourceIds = [
    newSourceId(),
    newSourceId(),
    newSourceId(),
  ] as const;
  const claimIds = [
    newClaimId(),
    newClaimId(),
    newClaimId(),
    newClaimId(),
  ] as const;
  const verificationIds = [
    newVerificationId(),
    newVerificationId(),
  ] as const;

  logger.info("Demo seed complete", {
    users: userIds.length,
    sources: sourceIds.length,
    claims: claimIds.length,
    verifications: verificationIds.length,
  });

  return {
    userIds,
    claimIds,
    sourceIds,
    verificationIds,
  };
}

/** Demo source records for reference. */
export const DEMO_SOURCES = [
  {
    name: "Reuters",
    url: "https://www.reuters.com",
    tier: "primary",
    description: "International news agency",
  },
  {
    name: "Associated Press",
    url: "https://apnews.com",
    tier: "primary",
    description: "Global news wire",
  },
  {
    name: "Wikipedia",
    url: "https://en.wikipedia.org",
    tier: "secondary",
    description: "Collaborative encyclopedia",
  },
] as const;

/** Demo claims for initial verification testing. */
export const DEMO_CLAIMS = [
  {
    text: "The Eiffel Tower is located in Paris, France.",
    expectedVerdict: "true",
  },
  {
    text: "The Moon is larger than the Earth.",
    expectedVerdict: "false",
  },
  {
    text: "TypeScript is a superset of JavaScript.",
    expectedVerdict: "true",
  },
  {
    text: "Water boils at 100°C at standard atmospheric pressure.",
    expectedVerdict: "true",
  },
] as const;
