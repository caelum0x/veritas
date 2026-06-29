// Incrementally parses a JSON object from a stream of string deltas.

import { ok, err, type Result } from "@veritas/core";

export interface ParsedJson {
  readonly value: unknown;
}

export type JsonParseResult = Result<ParsedJson, string>;

/**
 * JsonStreamParser accumulates string deltas and attempts to parse the
 * accumulated buffer as JSON whenever a complete structure may be present.
 * Call `push` with each delta, then `finish` to get the final result.
 */
export class JsonStreamParser {
  private buffer = "";
  private depth = 0;
  private inString = false;
  private escape = false;

  /** Appends a delta to the internal buffer and tracks JSON depth. */
  push(delta: string): void {
    for (const ch of delta) {
      if (this.escape) {
        this.escape = false;
      } else if (ch === "\\" && this.inString) {
        this.escape = true;
      } else if (ch === '"') {
        this.inString = !this.inString;
      } else if (!this.inString) {
        if (ch === "{" || ch === "[") this.depth++;
        else if (ch === "}" || ch === "]") this.depth--;
      }
    }
    this.buffer += delta;
  }

  /** Returns true when the accumulated buffer appears to form a complete JSON structure. */
  isComplete(): boolean {
    return this.depth === 0 && this.buffer.trim().length > 0;
  }

  /** Returns the current accumulated buffer without parsing. */
  raw(): string {
    return this.buffer;
  }

  /**
   * Attempts to parse the accumulated buffer as JSON.
   * Returns Ok<ParsedJson> on success or Err<string> on failure.
   */
  finish(): JsonParseResult {
    const trimmed = this.buffer.trim();
    if (trimmed.length === 0) {
      return err("Empty buffer — no JSON to parse");
    }
    try {
      const value: unknown = JSON.parse(trimmed);
      return ok({ value });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return err(`JSON parse error: ${msg}`);
    }
  }

  /** Resets the parser state for reuse. */
  reset(): void {
    this.buffer = "";
    this.depth = 0;
    this.inString = false;
    this.escape = false;
  }
}

/**
 * Convenience: parse a fully-accumulated JSON string in one shot.
 */
export function parseJson(raw: string): JsonParseResult {
  const parser = new JsonStreamParser();
  parser.push(raw);
  return parser.finish();
}
