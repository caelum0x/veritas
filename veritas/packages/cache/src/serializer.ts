// Value serialization — encode/decode cache values for wire/storage formats.
import type { JsonValue } from "@veritas/core";

export interface Serializer<V> {
  serialize(value: V): string;
  deserialize(raw: string): V;
}

/**
 * JSON serializer for any JSON-compatible value.
 * Throws a TypeError if the value cannot be serialized.
 */
export const jsonSerializer: Serializer<JsonValue> = {
  serialize(value: JsonValue): string {
    return JSON.stringify(value);
  },
  deserialize(raw: string): JsonValue {
    return JSON.parse(raw) as JsonValue;
  },
};

/**
 * Creates a typed JSON serializer that validates the deserialized shape via a predicate.
 * Throws if deserialization yields an unexpected shape.
 */
export function typedJsonSerializer<V>(
  guard: (v: unknown) => v is V,
  typeName = "unknown",
): Serializer<V> {
  return {
    serialize(value: V): string {
      return JSON.stringify(value);
    },
    deserialize(raw: string): V {
      const parsed: unknown = JSON.parse(raw);
      if (!guard(parsed)) {
        throw new TypeError(
          `Cache deserialization failed: expected ${typeName}`,
        );
      }
      return parsed;
    },
  };
}

/**
 * Identity serializer for caches that already store strings natively.
 */
export const stringSerializer: Serializer<string> = {
  serialize(value: string): string {
    return value;
  },
  deserialize(raw: string): string {
    return raw;
  },
};

/**
 * Wraps a serializer to add a thin envelope that carries type metadata,
 * enabling safe round-trips through untyped storage backends.
 */
export interface EnvelopedSerializer<V> extends Serializer<V> {
  readonly typeName: string;
}

/**
 * No-op serializer: stores values as-is (cast to string).
 * Useful for caches that already handle typed values natively.
 */
export const noopSerializer: Serializer<unknown> = {
  serialize(value: unknown): string {
    return value as string;
  },
  deserialize(raw: string): unknown {
    return raw;
  },
};

export function envelopedSerializer<V>(
  inner: Serializer<V>,
  typeName: string,
): EnvelopedSerializer<V> {
  return {
    typeName,
    serialize(value: V): string {
      return JSON.stringify({ t: typeName, d: inner.serialize(value) });
    },
    deserialize(raw: string): V {
      const parsed: unknown = JSON.parse(raw);
      if (
        typeof parsed !== "object" ||
        parsed === null ||
        !("t" in parsed) ||
        !("d" in parsed)
      ) {
        throw new TypeError(`Cache envelope malformed for type "${typeName}"`);
      }
      const envelope = parsed as { t: unknown; d: unknown };
      if (envelope.t !== typeName) {
        throw new TypeError(
          `Cache envelope type mismatch: expected "${typeName}", got "${String(envelope.t)}"`,
        );
      }
      if (typeof envelope.d !== "string") {
        throw new TypeError(
          `Cache envelope data must be a string for type "${typeName}"`,
        );
      }
      return inner.deserialize(envelope.d);
    },
  };
}
