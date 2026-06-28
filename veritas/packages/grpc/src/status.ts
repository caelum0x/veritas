// gRPC canonical status codes and mapping to AppError types
import type { AppError } from '@veritas/core';

export type GrpcStatusCode =
  | 0  // OK
  | 1  // CANCELLED
  | 2  // UNKNOWN
  | 3  // INVALID_ARGUMENT
  | 4  // DEADLINE_EXCEEDED
  | 5  // NOT_FOUND
  | 6  // ALREADY_EXISTS
  | 7  // PERMISSION_DENIED
  | 8  // RESOURCE_EXHAUSTED
  | 9  // FAILED_PRECONDITION
  | 10 // ABORTED
  | 11 // OUT_OF_RANGE
  | 12 // UNIMPLEMENTED
  | 13 // INTERNAL
  | 14 // UNAVAILABLE
  | 15 // DATA_LOSS
  | 16; // UNAUTHENTICATED

export const GrpcStatus = Object.freeze({
  OK: 0 as const,
  CANCELLED: 1 as const,
  UNKNOWN: 2 as const,
  INVALID_ARGUMENT: 3 as const,
  DEADLINE_EXCEEDED: 4 as const,
  NOT_FOUND: 5 as const,
  ALREADY_EXISTS: 6 as const,
  PERMISSION_DENIED: 7 as const,
  RESOURCE_EXHAUSTED: 8 as const,
  FAILED_PRECONDITION: 9 as const,
  ABORTED: 10 as const,
  OUT_OF_RANGE: 11 as const,
  UNIMPLEMENTED: 12 as const,
  INTERNAL: 13 as const,
  UNAVAILABLE: 14 as const,
  DATA_LOSS: 15 as const,
  UNAUTHENTICATED: 16 as const,
} satisfies Record<string, GrpcStatusCode>);

export const GRPC_STATUS_NAMES: Readonly<Record<GrpcStatusCode, string>> = Object.freeze({
  0: 'OK',
  1: 'CANCELLED',
  2: 'UNKNOWN',
  3: 'INVALID_ARGUMENT',
  4: 'DEADLINE_EXCEEDED',
  5: 'NOT_FOUND',
  6: 'ALREADY_EXISTS',
  7: 'PERMISSION_DENIED',
  8: 'RESOURCE_EXHAUSTED',
  9: 'FAILED_PRECONDITION',
  10: 'ABORTED',
  11: 'OUT_OF_RANGE',
  12: 'UNIMPLEMENTED',
  13: 'INTERNAL',
  14: 'UNAVAILABLE',
  15: 'DATA_LOSS',
  16: 'UNAUTHENTICATED',
});

export function grpcStatusName(code: GrpcStatusCode): string {
  return GRPC_STATUS_NAMES[code];
}

export function isOkStatus(code: GrpcStatusCode): boolean {
  return code === GrpcStatus.OK;
}

export function appErrorToGrpcStatus(error: AppError): GrpcStatusCode {
  switch (error.code) {
    case 'NOT_FOUND': return GrpcStatus.NOT_FOUND;
    case 'CONFLICT': return GrpcStatus.ALREADY_EXISTS;
    case 'VALIDATION': return GrpcStatus.INVALID_ARGUMENT;
    case 'UNAUTHORIZED': return GrpcStatus.UNAUTHENTICATED;
    case 'FORBIDDEN': return GrpcStatus.PERMISSION_DENIED;
    case 'RATE_LIMITED': return GrpcStatus.RESOURCE_EXHAUSTED;
    case 'UNAVAILABLE': return GrpcStatus.UNAVAILABLE;
    case 'INTERNAL': return GrpcStatus.INTERNAL;
    default: return GrpcStatus.UNKNOWN;
  }
}

export interface GrpcStatusObject {
  readonly code: GrpcStatusCode;
  readonly message: string;
  readonly details?: ReadonlyArray<Readonly<Record<string, unknown>>>;
}

export function makeStatus(
  code: GrpcStatusCode,
  message: string,
  details?: ReadonlyArray<Readonly<Record<string, unknown>>>,
): GrpcStatusObject {
  return Object.freeze({ code, message, details });
}

export function statusFromAppError(error: AppError): GrpcStatusObject {
  return makeStatus(appErrorToGrpcStatus(error), error.message);
}
