// Indexes claim text into the VectorStore by embedding and upserting each claim.

import { ok, err, type Result, epochToIso, systemClock } from "@veritas/core";
import type { Embedder } from "./embedder.js";
import type { VectorStore } from "./vector-store.js";
import type { IndexedClaim } from "./types.js";
import { IndexingError } from "./errors.js";

export interface ClaimInput {
  readonly claimId: string;
  readonly text: string;
}

export interface IndexerOptions {
  readonly embedder: Embedder;
  readonly store: VectorStore;
}

/** Embeds a batch of claims and upserts them into the vector store. */
export async function indexClaims(
  claims: ReadonlyArray<ClaimInput>,
  options: IndexerOptions,
): Promise<Result<ReadonlyArray<IndexedClaim>>> {
  const { embedder, store } = options;

  if (claims.length === 0) return ok(Object.freeze([]));

  const texts = claims.map((c) => c.text);
  const batchResult = await embedder.embedBatch(texts);

  if (!batchResult.ok) {
    return err(new IndexingError("Embedding batch failed", { cause: batchResult.error }));
  }

  const vectors = batchResult.value;
  if (vectors.length !== claims.length) {
    return err(
      new IndexingError(
        `Embedder returned ${vectors.length} vectors for ${claims.length} claims`,
      ),
    );
  }

  const indexed: IndexedClaim[] = [];
  const now = epochToIso(systemClock.now());

  for (let i = 0; i < claims.length; i++) {
    const claim = claims[i]!;
    const vector = vectors[i]!;

    const upsertResult = await store.upsert({
      id: claim.claimId,
      vector,
      metadata: { claimId: claim.claimId, text: claim.text, indexedAt: now },
    });

    if (!upsertResult.ok) {
      return err(
        new IndexingError(`Failed to upsert claim ${claim.claimId}`, {
          cause: upsertResult.error,
        }),
      );
    }

    indexed.push(
      Object.freeze<IndexedClaim>({
        claimId: claim.claimId,
        text: claim.text,
        vector,
        model: embedder.meta.model,
        indexedAt: now,
      }),
    );
  }

  return ok(Object.freeze(indexed));
}

/** Removes a claim from the vector store by id. */
export async function removeClaim(
  claimId: string,
  store: VectorStore,
): Promise<Result<void>> {
  const result = await store.delete(claimId);
  if (!result.ok) {
    return err(new IndexingError(`Failed to remove claim ${claimId}`, { cause: result.error }));
  }
  return ok(undefined);
}
