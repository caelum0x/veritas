// Ground claims in sources: resolve citation spans to verifiable source anchors.

import { type Result, ok, err } from "@veritas/core";
import { type LlmCitation } from "./types.js";
import { type SourceRef } from "./types.js";
import { type CitationSpan } from "./span.js";
import { CitationGroundingError, SourceNotFoundError } from "./errors.js";

/** A source document store sufficient for grounding. */
export interface SourceStore {
  /** Resolve a source by id. Returns undefined when not found. */
  getById(id: string): Promise<SourceRef | undefined>;
  /** Resolve a source by exact URL. Returns undefined when not found. */
  getByUrl(url: string): Promise<SourceRef | undefined>;
}

export interface GroundedCitation {
  readonly citation: LlmCitation;
  readonly source: SourceRef;
  readonly span: CitationSpan;
}

/** Resolve a single citation against the source store. */
export async function groundCitation(
  citation: LlmCitation,
  store: SourceStore,
): Promise<Result<GroundedCitation, CitationGroundingError | SourceNotFoundError>> {
  const sourceId = citation.span.sourceId;

  let source: SourceRef | undefined;
  if (sourceId) {
    source = await store.getById(sourceId);
  }
  if (!source) {
    source = await store.getByUrl(citation.span.url);
  }
  if (!source) {
    return err(new SourceNotFoundError(sourceId ?? citation.span.url));
  }

  const span: CitationSpan = {
    sourceId: source.id,
    url: source.url,
    startOffset: citation.span.startOffset,
    endOffset: citation.span.endOffset,
    text: citation.span.text,
    section: citation.span.section,
  };

  return ok({ citation, source, span });
}

/** Ground all citations in a list, collecting successes and failures separately. */
export async function groundAll(
  citations: readonly LlmCitation[],
  store: SourceStore,
): Promise<{
  readonly grounded: readonly GroundedCitation[];
  readonly failed: ReadonlyArray<{ citation: LlmCitation; reason: string }>;
}> {
  const grounded: GroundedCitation[] = [];
  const failed: Array<{ citation: LlmCitation; reason: string }> = [];

  await Promise.all(
    citations.map(async (citation) => {
      const result = await groundCitation(citation, store);
      if (result.ok) {
        grounded.push(result.value);
      } else {
        failed.push({ citation, reason: result.error.message });
      }
    }),
  );

  return { grounded, failed };
}

/** Build a no-op in-memory source store from a fixed list of SourceRefs. */
export function makeInMemorySourceStore(sources: readonly SourceRef[]): SourceStore {
  const byId = new Map<string, SourceRef>(sources.map((s) => [s.id, s]));
  const byUrl = new Map<string, SourceRef>(sources.map((s) => [s.url, s]));

  return {
    async getById(id: string): Promise<SourceRef | undefined> {
      return byId.get(id);
    },
    async getByUrl(url: string): Promise<SourceRef | undefined> {
      return byUrl.get(url);
    },
  };
}
