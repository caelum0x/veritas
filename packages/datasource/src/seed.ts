// Seed known authoritative sources into the store on startup.

import { type Result, ok, err, SourceTier } from "@veritas/core";
import type { CreateSource } from "@veritas/contracts";
import type { SourceStore } from "./store.js";
import { SeedError } from "./errors.js";

/** Well-known authoritative sources to pre-populate the store. */
const SEED_SOURCES: readonly CreateSource[] = [
  { url: "https://www.who.int", title: "World Health Organization", publisher: "WHO", tier: SourceTier.PRIMARY },
  { url: "https://www.cdc.gov", title: "Centers for Disease Control and Prevention", publisher: "CDC", tier: SourceTier.PRIMARY },
  { url: "https://www.nih.gov", title: "National Institutes of Health", publisher: "NIH", tier: SourceTier.PRIMARY },
  { url: "https://www.nature.com", title: "Nature", publisher: "Springer Nature", tier: SourceTier.PRIMARY },
  { url: "https://www.science.org", title: "Science", publisher: "AAAS", tier: SourceTier.PRIMARY },
  { url: "https://www.reuters.com", title: "Reuters", publisher: "Thomson Reuters", tier: SourceTier.SECONDARY },
  { url: "https://apnews.com", title: "Associated Press", publisher: "AP", tier: SourceTier.SECONDARY },
  { url: "https://www.bbc.co.uk", title: "BBC News", publisher: "BBC", tier: SourceTier.SECONDARY },
  { url: "https://www.economist.com", title: "The Economist", publisher: "The Economist Group", tier: SourceTier.SECONDARY },
  { url: "https://www.scientificamerican.com", title: "Scientific American", publisher: "Springer Nature", tier: SourceTier.SECONDARY },
  { url: "https://www.snopes.com", title: "Snopes", publisher: "Snopes Media Group", tier: SourceTier.TERTIARY },
  { url: "https://www.factcheck.org", title: "FactCheck.org", publisher: "Annenberg Public Policy Center", tier: SourceTier.SECONDARY },
  { url: "https://www.politifact.com", title: "PolitiFact", publisher: "Poynter Institute", tier: SourceTier.SECONDARY },
];

/** Seed result summary returned after seeding completes. */
export interface SeedResult {
  readonly inserted: number;
  readonly skipped: number;
  readonly errors: readonly string[];
}

/**
 * Seed the given SourceStore with known authoritative sources.
 * Skips duplicates (DuplicateSourceError) and collects other errors.
 */
export function seedKnownAuthorities(store: SourceStore): Result<SeedResult, SeedError> {
  let inserted = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const entry of SEED_SOURCES) {
    const result = store.save(entry);
    if (result.ok) {
      inserted++;
    } else {
      const e = result.error as { code?: string; message?: string };
      if (e?.code === "DUPLICATE_SOURCE") {
        skipped++;
      } else {
        errors.push(e?.message ?? String(e));
      }
    }
  }

  if (errors.length > 0 && inserted === 0) {
    return err(new SeedError(`All seed entries failed: ${errors.join("; ")}`));
  }

  return ok({ inserted, skipped, errors });
}
