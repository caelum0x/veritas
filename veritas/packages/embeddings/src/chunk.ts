// Text chunking utilities: splits long text into overlapping fixed-size character windows.

import { newId } from "@veritas/core";
import type { TextChunk, ChunkOptions } from "./types.js";
import { DEFAULT_CHUNK_OPTIONS } from "./types.js";

/** Splits `text` into overlapping character windows using the given ChunkOptions. */
export function chunkText(
  text: string,
  options: Partial<ChunkOptions> = {},
  metadata: Readonly<Record<string, unknown>> = {},
): ReadonlyArray<TextChunk> {
  const { maxTokens, overlapTokens, separator } = { ...DEFAULT_CHUNK_OPTIONS, ...options };

  if (maxTokens < 1) throw new RangeError(`maxTokens must be >= 1, got ${maxTokens}`);
  if (overlapTokens < 0) throw new RangeError(`overlapTokens must be >= 0, got ${overlapTokens}`);
  if (overlapTokens >= maxTokens) throw new RangeError("overlapTokens must be < maxTokens");

  const trimmed = text.trim();
  if (trimmed.length === 0) return Object.freeze([]);

  // Prefer sentence/paragraph splits when a separator is provided.
  const segments = separator
    ? splitBySeparator(trimmed, separator, maxTokens)
    : splitByLength(trimmed, maxTokens, overlapTokens);

  return Object.freeze(
    segments.map(({ text: segText, startChar, endChar }, index) =>
      Object.freeze<TextChunk>({
        id: newId("chunk"),
        text: segText,
        index,
        startChar,
        endChar,
        metadata,
      }),
    ),
  );
}

interface Segment {
  readonly text: string;
  readonly startChar: number;
  readonly endChar: number;
}

/** Fixed-length character windows with overlap. */
function splitByLength(text: string, size: number, overlap: number): Segment[] {
  const step = size - overlap;
  const segments: Segment[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + size, text.length);
    segments.push({ text: text.slice(start, end), startChar: start, endChar: end });
    if (end === text.length) break;
    start += step;
  }

  return segments;
}

/** Groups lines/paragraphs split by `separator` into chunks <= maxTokens chars. */
function splitBySeparator(text: string, separator: string, maxTokens: number): Segment[] {
  const parts = text.split(separator).filter((p) => p.trim().length > 0);
  const segments: Segment[] = [];
  let buffer = "";
  let bufferStart = 0;
  let pos = 0;

  for (const part of parts) {
    const joined = buffer.length === 0 ? part : `${buffer}${separator}${part}`;
    if (joined.length <= maxTokens) {
      if (buffer.length === 0) bufferStart = pos;
      buffer = joined;
    } else {
      if (buffer.length > 0) {
        segments.push({ text: buffer, startChar: bufferStart, endChar: bufferStart + buffer.length });
      }
      bufferStart = pos;
      buffer = part.slice(0, maxTokens);
    }
    pos += part.length + separator.length;
  }

  if (buffer.length > 0) {
    segments.push({ text: buffer, startChar: bufferStart, endChar: bufferStart + buffer.length });
  }

  return segments;
}
