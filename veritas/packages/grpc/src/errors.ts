// gRPC-specific error types and helpers for mapping AppErrors to gRPC status errors
import { AppError, toAppError } from '@veritas/core';
import { GrpcStatusCode, GrpcStatus, appErrorToGrpcStatus } from './status.js';

export class GrpcError extends Error {
  readonly code: GrpcStatusCode;
  readonly details: ReadonlyArray<Readonly<Record<string, unknown>>>;

  constructor(
    code: GrpcStatusCode,
    message: string,
    details: ReadonlyArray<Readonly<Record<string, unknown>>> = [],
  ) {
    super(message);
    this.name = 'GrpcError';
    this.code = code;
    this.details = Object.freeze([...details]);
  }
}

export function isGrpcError(value: unknown): value is GrpcError {
  return value instanceof GrpcError;
}

export function grpcErrorFromAppError(error: AppError): GrpcError {
  return new GrpcError(appErrorToGrpcStatus(error), error.message);
}

export function grpcErrorFromUnknown(cause: unknown): GrpcError {
  if (isGrpcError(cause)) return cause;
  const appError = toAppError(cause);
  return grpcErrorFromAppError(appError);
}

export function notFoundError(message: string): GrpcError {
  return new GrpcError(GrpcStatus.NOT_FOUND, message);
}

export function invalidArgumentError(message: string): GrpcError {
  return new GrpcError(GrpcStatus.INVALID_ARGUMENT, message);
}

export function unauthenticatedError(message: string): GrpcError {
  return new GrpcError(GrpcStatus.UNAUTHENTICATED, message);
}

export function permissionDeniedError(message: string): GrpcError {
  return new GrpcError(GrpcStatus.PERMISSION_DENIED, message);
}

export function alreadyExistsError(message: string): GrpcError {
  return new GrpcError(GrpcStatus.ALREADY_EXISTS, message);
}

export function resourceExhaustedError(message: string): GrpcError {
  return new GrpcError(GrpcStatus.RESOURCE_EXHAUSTED, message);
}

export function unavailableError(message: string): GrpcError {
  return new GrpcError(GrpcStatus.UNAVAILABLE, message);
}

export function internalError(message: string): GrpcError {
  return new GrpcError(GrpcStatus.INTERNAL, message);
}

export function unimplementedError(message: string): GrpcError {
  return new GrpcError(GrpcStatus.UNIMPLEMENTED, message);
}
