// Server-Sent Events (SSE) framing: encode and decode SSE messages over HTTP streams.

import { ok, err, type Result } from "@veritas/core";

export interface SseEvent {
  readonly id?: string;
  readonly event?: string;
  readonly data: string;
  readonly retry?: number;
}

/**
 * Encodes an SseEvent into the SSE wire format string.
 */
export function encodeSSE(event: SseEvent): string {
  const lines: string[] = [];
  if (event.id !== undefined) lines.push(`id: ${event.id}`);
  if (event.event !== undefined) lines.push(`event: ${event.event}`);
  if (event.retry !== undefined) lines.push(`retry: ${event.retry}`);
  // SSE data may be multi-line; each line must be prefixed.
  for (const line of event.data.split("\n")) {
    lines.push(`data: ${line}`);
  }
  lines.push("", ""); // blank line terminates an event
  return lines.join("\n");
}

export type SseDecodeResult = Result<SseEvent, string>;

/**
 * Decodes a single SSE event block (without the trailing double-newline).
 * Returns Err if no data field is present.
 */
export function decodeSSEBlock(block: string): SseDecodeResult {
  let id: string | undefined;
  let event: string | undefined;
  let retry: number | undefined;
  const dataLines: string[] = [];

  for (const raw of block.split("\n")) {
    const line = raw.trimEnd();
    if (line.startsWith("id:")) {
      id = line.slice(3).trimStart();
    } else if (line.startsWith("event:")) {
      event = line.slice(6).trimStart();
    } else if (line.startsWith("retry:")) {
      const n = parseInt(line.slice(6).trimStart(), 10);
      if (!isNaN(n)) retry = n;
    } else if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trimStart());
    } else if (line.startsWith(":")) {
      // comment — ignore
    }
  }

  if (dataLines.length === 0) {
    return err("SSE block has no data field");
  }

  return ok({ id, event, retry, data: dataLines.join("\n") });
}

/**
 * Splits a raw SSE text stream (potentially partial) into complete event blocks.
 * Returns the parsed events and any remaining partial buffer.
 */
export function splitSSEBlocks(
  buffer: string,
  incoming: string,
): { events: SseEvent[]; remainder: string } {
  const combined = buffer + incoming;
  const rawBlocks = combined.split(/\n\n/);
  // The last element is either empty (complete) or a partial block.
  const remainder = rawBlocks.pop() ?? "";
  const events: SseEvent[] = [];

  for (const block of rawBlocks) {
    const trimmed = block.trim();
    if (trimmed.length === 0) continue;
    const result = decodeSSEBlock(trimmed);
    if (result.ok) {
      events.push(result.value);
    }
  }

  return { events, remainder };
}

/**
 * AsyncGenerator that reads from a Node.js-compatible async iterable of string chunks
 * and yields parsed SseEvent objects.
 */
export async function* parseSSEStream(
  source: AsyncIterable<string>,
): AsyncIterable<SseEvent> {
  let remainder = "";
  for await (const chunk of source) {
    const { events, remainder: next } = splitSSEBlocks(remainder, chunk);
    remainder = next;
    for (const event of events) {
      yield event;
    }
  }
  // Flush any remaining block at stream end.
  if (remainder.trim().length > 0) {
    const result = decodeSSEBlock(remainder.trim());
    if (result.ok) {
      yield result.value;
    }
  }
}
