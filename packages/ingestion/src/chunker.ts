// Chunker: splits extracted document text into overlapping token-aware chunks.

import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";

export interface ChunkOptions {
  /** Target chunk size in characters (default 1000). */
  readonly chunkSize?: number;
  /** Overlap between adjacent chunks in characters (default 100). */
  readonly overlap?: number;
  /** Separator pattern used to split text before chunking (default newline). */
  readonly separator?: RegExp;
}

export interface TextChunk {
  readonly index: number;
  readonly text: string;
  readonly startChar: number;
  readonly endChar: number;
}

const DEFAULT_CHUNK_SIZE = 1000;
const DEFAULT_OVERLAP = 100;

function splitBySeparator(text: string, separator: RegExp): string[] {
  return text
    .split(separator)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function buildChunks(
  segments: string[],
  chunkSize: number,
  overlap: number,
): { text: string; startChar: number; endChar: number }[] {
  const chunks: { text: string; startChar: number; endChar: number }[] = [];
  let current = "";
  let currentStart = 0;
  let globalChar = 0;

  for (const seg of segments) {
    const candidate = current.length > 0 ? current + " " + seg : seg;
    if (candidate.length <= chunkSize) {
      if (current.length === 0) currentStart = globalChar;
      current = candidate;
    } else {
      if (current.length > 0) {
        chunks.push({ text: current, startChar: currentStart, endChar: currentStart + current.length });
        // Retain overlap from end of current chunk
        const overlapText = current.slice(Math.max(0, current.length - overlap));
        current = overlapText.length > 0 ? overlapText + " " + seg : seg;
        currentStart = currentStart + current.length - overlapText.length;
      } else {
        // Single segment longer than chunkSize — split hard
        let pos = 0;
        while (pos < seg.length) {
          const slice = seg.slice(pos, pos + chunkSize);
          chunks.push({ text: slice, startChar: globalChar + pos, endChar: globalChar + pos + slice.length });
          pos += chunkSize - overlap;
        }
        current = "";
      }
    }
    globalChar += seg.length + 1;
  }

  if (current.length > 0) {
    chunks.push({ text: current, startChar: currentStart, endChar: currentStart + current.length });
  }

  return chunks;
}

export function chunkText(text: string, options: ChunkOptions = {}): Result<readonly TextChunk[]> {
  if (typeof text !== "string") {
    return err(new Error("chunkText: input must be a string"));
  }

  const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const overlap = options.overlap ?? DEFAULT_OVERLAP;
  const separator = options.separator ?? /\n+/;

  if (chunkSize <= 0) return err(new Error("chunkText: chunkSize must be positive"));
  if (overlap < 0) return err(new Error("chunkText: overlap must be non-negative"));
  if (overlap >= chunkSize) return err(new Error("chunkText: overlap must be less than chunkSize"));

  if (text.trim().length === 0) return ok([]);

  const segments = splitBySeparator(text, separator);
  const raw = buildChunks(segments, chunkSize, overlap);

  const chunks: TextChunk[] = raw.map((c, i) => ({
    index: i,
    text: c.text,
    startChar: c.startChar,
    endChar: c.endChar,
  }));

  return ok(Object.freeze(chunks));
}
