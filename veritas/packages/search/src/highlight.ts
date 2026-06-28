// Snippet highlight — extracts and marks matching terms in document field text
import { analyze } from "./analyzer.js";

export interface HighlightOptions {
  readonly preTag?: string;
  readonly postTag?: string;
  readonly snippetLength?: number;
  readonly stem?: boolean;
}

const DEFAULT_PRE = "<mark>";
const DEFAULT_POST = "</mark>";
const DEFAULT_SNIPPET_LEN = 160;

function findBestWindow(
  text: string,
  matchIndices: readonly number[],
  windowSize: number
): { start: number; end: number } {
  if (matchIndices.length === 0) {
    return { start: 0, end: Math.min(windowSize, text.length) };
  }
  const firstMatch = matchIndices[0] ?? 0;
  const start = Math.max(0, firstMatch - Math.floor(windowSize / 3));
  const end = Math.min(text.length, start + windowSize);
  return { start, end };
}

function findMatchOffsets(
  text: string,
  termSet: ReadonlySet<string>,
  stem: boolean
): Array<{ start: number; end: number }> {
  const offsets: Array<{ start: number; end: number }> = [];
  const wordRegex = /\b\w+\b/g;
  let match: RegExpExecArray | null;
  while ((match = wordRegex.exec(text)) !== null) {
    const word = match[0];
    if (!word) continue;
    const analyzed = analyze(word, { stem });
    if (analyzed.some((t) => termSet.has(t))) {
      offsets.push({ start: match.index, end: match.index + word.length });
    }
  }
  return offsets;
}

export function highlight(
  text: string,
  queryTerms: readonly string[],
  options: HighlightOptions = {}
): string {
  const preTag = options.preTag ?? DEFAULT_PRE;
  const postTag = options.postTag ?? DEFAULT_POST;
  const snippetLen = options.snippetLength ?? DEFAULT_SNIPPET_LEN;
  const stem = options.stem ?? false;

  const termSet = new Set(queryTerms.map((t) => t.toLowerCase()));
  const offsets = findMatchOffsets(text, termSet, stem);

  const matchStarts = offsets.map((o) => o.start);
  const { start, end } = findBestWindow(text, matchStarts, snippetLen);
  const snippet = text.slice(start, end);

  if (offsets.length === 0) {
    const trimmed = snippet.trim();
    return (start > 0 ? "…" : "") + trimmed + (end < text.length ? "…" : "");
  }

  const snippetOffsets = offsets
    .filter((o) => o.start >= start && o.end <= end)
    .map((o) => ({ start: o.start - start, end: o.end - start }));

  let result = "";
  let cursor = 0;
  for (const { start: s, end: e } of snippetOffsets) {
    result += snippet.slice(cursor, s);
    result += preTag + snippet.slice(s, e) + postTag;
    cursor = e;
  }
  result += snippet.slice(cursor);

  return (start > 0 ? "…" : "") + result + (end < text.length ? "…" : "");
}

export function highlightFields(
  fields: Record<string, unknown>,
  queryTerms: readonly string[],
  fieldNames: readonly string[],
  options: HighlightOptions = {}
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const field of fieldNames) {
    const value = fields[field];
    if (typeof value === "string" && value.length > 0) {
      result[field] = highlight(value, queryTerms, options);
    }
  }
  return result;
}
