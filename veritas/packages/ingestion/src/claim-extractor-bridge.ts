// Bridge from ingested documents to verification claim extraction inputs.

import { z } from "zod";
import { contentHash } from "@veritas/core";
import type { IngestedDocument } from "./document.js";

/** A raw claim candidate surfaced from an ingested document. */
export const ClaimCandidateSchema = z.object({
  /** The claim text as it appeared in the document. */
  text: z.string().min(1),
  /** Character offset within the document's textContent. */
  startOffset: z.number().int().min(0),
  endOffset: z.number().int().min(0),
  /** Stable hash of the claim text for deduplication. */
  claimHash: z.string(),
  /** Origin document id. */
  documentId: z.string(),
  /** Source URL the claim came from. */
  sourceUrl: z.string(),
  /** Optional surrounding context (sentence window). */
  context: z.string().optional(),
});

export type ClaimCandidate = z.infer<typeof ClaimCandidateSchema>;

/** Options controlling claim candidate extraction. */
export interface ExtractClaimCandidatesOptions {
  /** Minimum sentence character length to consider. Default: 20 */
  readonly minLength?: number;
  /** Maximum candidates to return. 0 = no limit. Default: 0 */
  readonly maxCandidates?: number;
  /** Include surrounding context sentences. Default: true */
  readonly includeContext?: boolean;
}

const DEFAULTS: Required<ExtractClaimCandidatesOptions> = {
  minLength: 20,
  maxCandidates: 0,
  includeContext: true,
};

/**
 * Split document textContent into claim candidates by sentence boundary.
 * Filters short fragments and optionally attaches context.
 */
export function extractClaimCandidates(
  doc: IngestedDocument,
  options?: ExtractClaimCandidatesOptions,
): ReadonlyArray<ClaimCandidate> {
  const opts = { ...DEFAULTS, ...options };
  const text = doc.textContent;

  const sentences = splitSentences(text);
  const candidates: ClaimCandidate[] = [];

  let cursor = 0;
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    if (sentence === undefined) continue;
    const startOffset = text.indexOf(sentence, cursor);
    const endOffset = startOffset + sentence.length;
    cursor = endOffset;

    if (sentence.length < opts.minLength) continue;

    const context = opts.includeContext
      ? buildContext(sentences, i)
      : undefined;

    const hash = contentHash(sentence);

    candidates.push(
      ClaimCandidateSchema.parse({
        text: sentence,
        startOffset,
        endOffset,
        claimHash: hash,
        documentId: doc.id,
        sourceUrl: doc.sourceRef.url,
        context,
      }),
    );

    if (opts.maxCandidates > 0 && candidates.length >= opts.maxCandidates) break;
  }

  return candidates;
}

/** Split text into sentences on `. ? !` boundaries. */
function splitSentences(text: string): ReadonlyArray<string> {
  return text
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** Build a context string from the window of surrounding sentences. */
function buildContext(
  sentences: ReadonlyArray<string>,
  index: number,
  windowSize = 1,
): string {
  const start = Math.max(0, index - windowSize);
  const end = Math.min(sentences.length - 1, index + windowSize);
  return sentences.slice(start, end + 1).join(" ");
}
