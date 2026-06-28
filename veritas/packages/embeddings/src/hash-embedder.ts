// Deterministic hash-based Embedder that produces fixed-dim vectors without an external API.

import { ok, err, type Result, sha256Hex } from "@veritas/core";
import type { Embedder, EmbedderMeta } from "./embedder.js";
import { makeVector, type Vector } from "./vector.js";

const DEFAULT_DIM = 128;

/** Derives a deterministic pseudo-embedding from the SHA-256 hash of the input text. */
export class HashEmbedder implements Embedder {
  readonly meta: EmbedderMeta;

  constructor(dim: number = DEFAULT_DIM) {
    if (dim < 1 || dim > 4096) {
      throw new RangeError(`dim must be in [1, 4096], got ${dim}`);
    }
    this.meta = Object.freeze({ model: "hash-embedder-v1", dimensions: dim });
  }

  async embed(text: string): Promise<Result<Vector>> {
    try {
      const hash = sha256Hex(text);
      const components = hashToComponents(hash, this.meta.dimensions);
      return ok(makeVector(components));
    } catch (e) {
      return err(e);
    }
  }

  async embedBatch(texts: ReadonlyArray<string>): Promise<Result<ReadonlyArray<Vector>>> {
    try {
      const vectors: Vector[] = [];
      for (const text of texts) {
        const hash = sha256Hex(text);
        vectors.push(makeVector(hashToComponents(hash, this.meta.dimensions)));
      }
      return ok(Object.freeze(vectors));
    } catch (e) {
      return err(e);
    }
  }
}

/** Expands a hex hash string into `dim` float components in [-1, 1]. */
function hashToComponents(hex: string, dim: number): number[] {
  const components: number[] = [];
  let cursor = 0;

  while (components.length < dim) {
    // Take 2 hex chars (1 byte) at a time, cycling through the hash.
    const offset = cursor % hex.length;
    const byteHex = hex.slice(offset, offset + 2).padEnd(2, "0");
    const byte = parseInt(byteHex, 16);
    // Map [0, 255] → [-1, 1]
    components.push((byte / 127.5) - 1.0);
    cursor += 2;
  }

  return components;
}
