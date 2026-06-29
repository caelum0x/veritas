// Shared primitive types and type aliases used throughout the gRPC module
import type { Result } from '@veritas/core';
import type { GrpcStatusCode } from './status.js';

/** Key-value pairs sent as gRPC metadata (headers/trailers). */
export type MetadataMap = Readonly<Record<string, string | ReadonlyArray<string>>>;

/** A single scalar metadata value. */
export type MetadataValue = string | ReadonlyArray<string>;

/** Streaming mode for a gRPC method. */
export type StreamingMode = 'unary' | 'server' | 'client' | 'bidi';

/** Credential type for a gRPC channel or server. */
export type CredentialType = 'insecure' | 'tls' | 'alts';

/** Deadline expressed as absolute epoch milliseconds. */
export type DeadlineMs = number;

/** gRPC call context passed to handlers and interceptors. */
export interface CallContext {
  readonly metadata: MetadataMap;
  readonly deadline?: DeadlineMs;
  readonly peer?: string;
}

/** Unary handler signature: request in, response or error out. */
export type UnaryHandler<TReq, TRes> = (
  request: TReq,
  ctx: CallContext,
) => Promise<TRes>;

/** Server-streaming handler: yields multiple responses. */
export type ServerStreamHandler<TReq, TRes> = (
  request: TReq,
  ctx: CallContext,
) => AsyncIterable<TRes>;

/** Client-streaming handler: consumes multiple requests, returns one response. */
export type ClientStreamHandler<TReq, TRes> = (
  requests: AsyncIterable<TReq>,
  ctx: CallContext,
) => Promise<TRes>;

/** Bidirectional streaming handler. */
export type BidiStreamHandler<TReq, TRes> = (
  requests: AsyncIterable<TReq>,
  ctx: CallContext,
) => AsyncIterable<TRes>;

/** Union over all handler shapes. */
export type AnyHandler =
  | UnaryHandler<unknown, unknown>
  | ServerStreamHandler<unknown, unknown>
  | ClientStreamHandler<unknown, unknown>
  | BidiStreamHandler<unknown, unknown>;

/** Result type specialised for gRPC status errors. */
export interface GrpcResultErr {
  readonly code: GrpcStatusCode;
  readonly message: string;
}

export type GrpcResult<T> = Result<T, GrpcResultErr>;

/** Serialisation codec pair. */
export interface Codec<T> {
  encode(value: T): Uint8Array;
  decode(bytes: Uint8Array): T;
}

/** Options for a gRPC call made by a client port. */
export interface CallOptions {
  readonly metadata?: MetadataMap;
  readonly deadline?: DeadlineMs;
  readonly timeoutMs?: number;
}
