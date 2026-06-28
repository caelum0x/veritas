// gRPC codec — serialize/deserialize message payloads as JSON over the port interface
import type { Result } from '@veritas/core';
import { ok, err } from '@veritas/core';

export interface Codec<T> {
  readonly contentType: string;
  encode(value: T): Result<Uint8Array>;
  decode(bytes: Uint8Array): Result<T>;
}

export interface AnyCodec {
  readonly contentType: string;
  encode(value: unknown): Result<Uint8Array>;
  decode(bytes: Uint8Array): Result<unknown>;
}

const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder();

export function jsonCodec<T>(): Codec<T> {
  return {
    contentType: 'application/json',
    encode(value: T): Result<Uint8Array> {
      try {
        const json = JSON.stringify(value);
        return ok(TEXT_ENCODER.encode(json));
      } catch (e) {
        return err(e);
      }
    },
    decode(bytes: Uint8Array): Result<T> {
      try {
        const json = TEXT_DECODER.decode(bytes);
        return ok(JSON.parse(json) as T);
      } catch (e) {
        return err(e);
      }
    },
  };
}

export function identityCodec(): Codec<Uint8Array> {
  return {
    contentType: 'application/octet-stream',
    encode(value: Uint8Array): Result<Uint8Array> {
      return ok(value);
    },
    decode(bytes: Uint8Array): Result<Uint8Array> {
      return ok(bytes);
    },
  };
}

export function withContentType<T>(
  codec: Codec<T>,
  contentType: string,
): Codec<T> {
  return Object.freeze({ ...codec, contentType });
}

export function encodeToBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64');
}

export function decodeFromBase64(b64: string): Result<Uint8Array> {
  try {
    return ok(new Uint8Array(Buffer.from(b64, 'base64')));
  } catch (e) {
    return err(e);
  }
}

export function encodeMessage<T>(codec: Codec<T>, value: T): Result<string> {
  const encoded = codec.encode(value);
  if (encoded.ok) {
    return ok(encodeToBase64(encoded.value));
  }
  return err(encoded.error);
}

export function decodeMessage<T>(codec: Codec<T>, b64: string): Result<T> {
  const bytes = decodeFromBase64(b64);
  if (!bytes.ok) return err(bytes.error);
  return codec.decode(bytes.value);
}
