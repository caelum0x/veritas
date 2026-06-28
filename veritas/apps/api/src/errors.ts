// Application-level error types that augment domain errors with HTTP semantics.
export { HttpApiError, toHttpError, isHttpApiError } from "./http/api-error.js";

/** Thrown when a feature module receives an unsupported operation. */
export class NotImplementedError extends Error {
  constructor(operation: string) {
    super(`Not implemented: ${operation}`);
    this.name = "NotImplementedError";
  }
}
