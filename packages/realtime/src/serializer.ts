// Frame serializer: encodes and decodes realtime wire frames as JSON strings.
import type { RealtimeEvent, SerializedFrame } from "./types.js";
import { SerializationError } from "./errors.js";
import { ok, err, type Result } from "@veritas/core";

export interface HeartbeatFrame {
  readonly ts: string;
}

export interface ErrorFrame {
  readonly code: string;
  readonly message: string;
}

type FramePayload = RealtimeEvent | HeartbeatFrame | ErrorFrame | Record<string, unknown>;

export function serializeEvent(event: RealtimeEvent): Result<SerializedFrame, SerializationError> {
  try {
    return ok({ type: "event", data: JSON.stringify(event) });
  } catch (e) {
    return err(new SerializationError(e instanceof Error ? e.message : String(e)));
  }
}

export function serializeHeartbeat(ts: string): Result<SerializedFrame, SerializationError> {
  try {
    const payload: HeartbeatFrame = { ts };
    return ok({ type: "heartbeat", data: JSON.stringify(payload) });
  } catch (e) {
    return err(new SerializationError(e instanceof Error ? e.message : String(e)));
  }
}

export function serializeError(code: string, message: string): Result<SerializedFrame, SerializationError> {
  try {
    const payload: ErrorFrame = { code, message };
    return ok({ type: "error", data: JSON.stringify(payload) });
  } catch (e) {
    return err(new SerializationError(e instanceof Error ? e.message : String(e)));
  }
}

export function deserializeFrame(frame: SerializedFrame): Result<FramePayload, SerializationError> {
  try {
    const parsed: unknown = JSON.parse(frame.data);
    if (typeof parsed !== "object" || parsed === null) {
      return err(new SerializationError("Expected JSON object"));
    }
    return ok(parsed as FramePayload);
  } catch (e) {
    return err(new SerializationError(e instanceof Error ? e.message : String(e)));
  }
}

export function toSseString(frame: SerializedFrame): string {
  return `event: ${frame.type}\ndata: ${frame.data}\n\n`;
}

export function parseRealtimeEvent(raw: unknown): Result<RealtimeEvent, SerializationError> {
  if (
    typeof raw !== "object" ||
    raw === null ||
    !("id" in raw) ||
    !("topic" in raw) ||
    !("type" in raw) ||
    !("payload" in raw) ||
    !("timestamp" in raw)
  ) {
    return err(new SerializationError("Missing required RealtimeEvent fields"));
  }
  const candidate = raw as Record<string, unknown>;
  if (
    typeof candidate["id"] !== "string" ||
    typeof candidate["topic"] !== "string" ||
    typeof candidate["type"] !== "string" ||
    typeof candidate["timestamp"] !== "string"
  ) {
    return err(new SerializationError("RealtimeEvent field type mismatch"));
  }
  return ok({
    id: candidate["id"],
    topic: candidate["topic"],
    type: candidate["type"],
    payload: candidate["payload"],
    timestamp: candidate["timestamp"],
  });
}
