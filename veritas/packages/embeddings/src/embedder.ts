// Port interface for text-to-vector embedding with model metadata.

import type { Vector } from "./vector.js";
import type { Result } from "@veritas/core";

export interface EmbedderMeta {
  readonly model: string;
  readonly dimensions: number;
}

export interface Embedder {
  readonly meta: EmbedderMeta;
  embed(text: string): Promise<Result<Vector>>;
  embedBatch(texts: ReadonlyArray<string>): Promise<Result<ReadonlyArray<Vector>>>;
}
