// GraphQL error formatting and AppError → GraphQLError conversion
import { GraphQLError, GraphQLFormattedError } from "graphql";
import {
  AppError,
  isAppError,
  ErrorCode,
  NotFoundError,
  ConflictError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  RateLimitedError,
  UnavailableError,
} from "@veritas/core";

export interface GqlErrorExtensions {
  code: string;
  status: number;
  details?: unknown;
}

const ERROR_STATUS: Partial<Record<ErrorCode, number>> = {
  NOT_FOUND: 404,
  CONFLICT: 409,
  VALIDATION: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  RATE_LIMITED: 429,
  UNAVAILABLE: 503,
  INTERNAL: 500,
};

function codeToStatus(code: ErrorCode): number {
  return ERROR_STATUS[code] ?? 500;
}

export function appErrorToGraphQL(err: AppError): GraphQLError {
  const extensions: GqlErrorExtensions = {
    code: err.code,
    status: codeToStatus(err.code),
    details: err.details ?? undefined,
  };
  return new GraphQLError(err.message, { extensions: extensions as unknown as Record<string, unknown> });
}

export function toGraphQLError(err: unknown): GraphQLError {
  if (err instanceof GraphQLError) return err;
  if (isAppError(err)) return appErrorToGraphQL(err);
  const message = err instanceof Error ? err.message : "Internal server error";
  return new GraphQLError(message, {
    extensions: { code: "INTERNAL", status: 500 },
  });
}

export function formatError(
  formattedError: GraphQLFormattedError,
  _error: unknown
): GraphQLFormattedError {
  // Strip stack traces in production
  const ext = formattedError.extensions as GqlErrorExtensions | undefined;
  return {
    message: formattedError.message,
    locations: formattedError.locations,
    path: formattedError.path,
    extensions: ext
      ? { code: ext.code, status: ext.status, details: ext.details }
      : { code: "INTERNAL", status: 500 },
  };
}

export function notFound(resource: string, id: string): GraphQLError {
  return appErrorToGraphQL(new NotFoundError({ message: `${resource} '${id}' not found` }));
}

export function conflict(message: string): GraphQLError {
  return appErrorToGraphQL(new ConflictError({ message }));
}

export function validationError(message: string, details?: Readonly<Record<string, unknown>>): GraphQLError {
  return appErrorToGraphQL(new ValidationError({ message, details }));
}

/** Alias kept for resolvers that import toGqlError. */
export const toGqlError = toGraphQLError;

export function unauthorized(message = "Unauthorized"): GraphQLError {
  return appErrorToGraphQL(new UnauthorizedError({ message }));
}

export function forbidden(message = "Forbidden"): GraphQLError {
  return appErrorToGraphQL(new ForbiddenError({ message }));
}

export function rateLimited(message = "Rate limit exceeded"): GraphQLError {
  return appErrorToGraphQL(new RateLimitedError({ message }));
}

export function unavailable(message = "Service unavailable"): GraphQLError {
  return appErrorToGraphQL(new UnavailableError({ message }));
}
