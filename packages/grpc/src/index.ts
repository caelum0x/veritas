// Public surface of @veritas/grpc — re-exports all descriptors, ports, codecs, and utilities
export * from './service.js';
export * from './method.js';
export * from './message.js';
export * from './proto-emit.js';
export * from './server-port.js';
export * from './status.js';
export * from './metadata.js';
export * from './codec.js';
export * from './interceptor.js';
export * from './errors.js';
// Explicit named exports from types.ts to avoid ambiguity with codec.ts (Codec),
// metadata.ts (MetadataValue), and method.ts (StreamingMode)
export type {
  MetadataMap,
  CredentialType,
  DeadlineMs,
  CallContext,
  UnaryHandler,
  ServerStreamHandler,
  ClientStreamHandler,
  BidiStreamHandler,
  AnyHandler,
  GrpcResultErr,
  GrpcResult,
  CallOptions,
} from './types.js';
