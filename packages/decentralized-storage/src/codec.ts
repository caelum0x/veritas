// Block codec: encode and decode content blocks to/from Uint8Array using dag-json or raw codec.

import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { Codec } from "./cid.js";
import { encodeError, decodeError } from "./errors.js";
import type { StorageError } from "./errors.js";

/** A decoded block whose payload is typed by codec. */
export interface DecodedBlock {
  readonly codec: Codec;
  readonly payload: unknown; // JSON-parsed for dag-json/dag-cbor; Uint8Array for raw
}

const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder();

/** Encode a value to bytes using the specified codec. */
export function encode(value: unknown, codec: Codec): Result<Uint8Array, StorageError> {
  if (codec === "raw") {
    if (!(value instanceof Uint8Array)) {
      return err(encodeError("raw codec requires Uint8Array input"));
    }
    return ok(value);
  }

  // dag-json and dag-cbor: serialize to JSON bytes (dag-cbor uses JSON wire format here).
  try {
    const json = JSON.stringify(value);
    if (json === undefined) {
      return err(encodeError(`${codec}: value is not serializable`));
    }
    return ok(TEXT_ENCODER.encode(json));
  } catch (cause) {
    return err(encodeError(`${codec}: serialization failed`, cause));
  }
}

/** Decode bytes produced by encode() back to a DecodedBlock. */
export function decode(bytes: Uint8Array, codec: Codec): Result<DecodedBlock, StorageError> {
  if (codec === "raw") {
    return ok({ codec, payload: bytes });
  }

  try {
    const text = TEXT_DECODER.decode(bytes);
    const payload: unknown = JSON.parse(text);
    return ok({ codec, payload });
  } catch (cause) {
    return err(decodeError(`${codec}: deserialization failed`, cause));
  }
}

/** Round-trip encode then decode; useful for validation in adapters. */
export function roundTrip(
  value: unknown,
  codec: Codec
): Result<DecodedBlock, StorageError> {
  const encoded = encode(value, codec);
  if (!encoded.ok) return encoded;
  return decode(encoded.value, codec);
}

/** Return the MIME type associated with a codec. */
export function mimeType(codec: Codec): string {
  switch (codec) {
    case "raw":
      return "application/octet-stream";
    case "dag-json":
      return "application/json";
    case "dag-cbor":
      return "application/cbor";
  }
}
