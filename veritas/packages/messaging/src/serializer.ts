// Serializer: encode and decode Message envelopes to/from JSON bytes or strings.
import { ok, err, type Result } from "@veritas/core";
import type { Message } from "./message.js";
import { MessageSerializationError } from "./errors.js";

export interface Serializer {
  serialize<TPayload>(message: Message<TPayload>): Result<string, MessageSerializationError>;
  deserialize<TPayload>(raw: string): Result<Message<TPayload>, MessageSerializationError>;
}

export interface SerializerOptions {
  readonly replacer?: (key: string, value: unknown) => unknown;
  readonly reviver?: (key: string, value: unknown) => unknown;
}

export class JsonSerializer implements Serializer {
  private readonly replacer?: (key: string, value: unknown) => unknown;
  private readonly reviver?: (key: string, value: unknown) => unknown;

  constructor(options: SerializerOptions = {}) {
    this.replacer = options.replacer;
    this.reviver = options.reviver;
  }

  serialize<TPayload>(message: Message<TPayload>): Result<string, MessageSerializationError> {
    try {
      const raw = JSON.stringify(message, this.replacer as Parameters<typeof JSON.stringify>[1]);
      return ok(raw);
    } catch (cause) {
      return err(new MessageSerializationError(cause));
    }
  }

  deserialize<TPayload>(raw: string): Result<Message<TPayload>, MessageSerializationError> {
    try {
      const parsed = JSON.parse(raw, this.reviver as Parameters<typeof JSON.parse>[1]) as Message<TPayload>;
      return ok(parsed);
    } catch (cause) {
      return err(new MessageSerializationError(cause));
    }
  }
}

/** Default singleton JSON serializer with no custom replacer/reviver. */
export const defaultSerializer: Serializer = new JsonSerializer();

/** Serialize to a Uint8Array for transport-level byte handling. */
export function serializeToBytes<TPayload>(
  message: Message<TPayload>,
  serializer: Serializer = defaultSerializer,
): Result<Uint8Array, MessageSerializationError> {
  const strResult = serializer.serialize(message);
  if (strResult.ok === false) return strResult;
  return ok(new TextEncoder().encode(strResult.value));
}

/** Deserialize from a Uint8Array. */
export function deserializeFromBytes<TPayload>(
  bytes: Uint8Array,
  serializer: Serializer = defaultSerializer,
): Result<Message<TPayload>, MessageSerializationError> {
  try {
    const raw = new TextDecoder().decode(bytes);
    return serializer.deserialize<TPayload>(raw);
  } catch (cause) {
    return err(new MessageSerializationError(cause));
  }
}
