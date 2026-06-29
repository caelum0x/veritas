// Composition-specific error classes for @veritas/composition.

/** Thrown when a duplicate base path is registered. */
export class DuplicatePathError extends Error {
  constructor(public readonly path: string) {
    super(`Duplicate mount path: "${path}"`);
    this.name = "DuplicatePathError";
  }
}

/** Thrown when an app name collision is detected in the registry. */
export class DuplicateAppNameError extends Error {
  constructor(public readonly appName: string) {
    super(`Duplicate app name in registry: "${appName}"`);
    this.name = "DuplicateAppNameError";
  }
}

/** Thrown when attempting to mount with an invalid base path. */
export class InvalidBasePathError extends Error {
  constructor(public readonly path: string) {
    super(`Invalid base path "${path}": must start with "/"`);
    this.name = "InvalidBasePathError";
  }
}

/** Thrown when a required app is missing from the registry. */
export class AppNotFoundError extends Error {
  constructor(public readonly name: string) {
    super(`App not found in registry: "${name}"`);
    this.name = "AppNotFoundError";
  }
}

/** Thrown when a worker fails to start. */
export class WorkerStartError extends Error {
  constructor(
    public readonly workerName: string,
    cause: unknown,
  ) {
    super(
      `Worker "${workerName}" failed to start: ${cause instanceof Error ? cause.message : String(cause)}`,
    );
    this.name = "WorkerStartError";
    if (cause instanceof Error) this.cause = cause;
  }
}

/** Thrown when a worker fails to stop cleanly. */
export class WorkerStopError extends Error {
  constructor(
    public readonly workerName: string,
    cause: unknown,
  ) {
    super(
      `Worker "${workerName}" failed to stop: ${cause instanceof Error ? cause.message : String(cause)}`,
    );
    this.name = "WorkerStopError";
    if (cause instanceof Error) this.cause = cause;
  }
}

/** Thrown when graceful shutdown exceeds the configured timeout. */
export class ShutdownTimeoutError extends Error {
  constructor(public readonly timeoutMs: number) {
    super(`Graceful shutdown timed out after ${timeoutMs}ms`);
    this.name = "ShutdownTimeoutError";
  }
}

/** Thrown when a lifecycle component fails to start. */
export class LifecycleStartError extends Error {
  constructor(
    public readonly componentName: string,
    cause: unknown,
  ) {
    super(
      `Lifecycle component "${componentName}" failed to start: ${cause instanceof Error ? cause.message : String(cause)}`,
    );
    this.name = "LifecycleStartError";
    if (cause instanceof Error) this.cause = cause;
  }
}
