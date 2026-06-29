// errors.ts: domain errors for the event-wiring package.

import { AppError, type AppErrorOptions } from "@veritas/core";

export class WiringError extends AppError {
  constructor(message: string, opts?: AppErrorOptions) {
    super("INTERNAL", 500, message, opts);
  }
}

export class BridgeStartError extends WiringError {
  constructor(bridge: string, cause?: unknown) {
    super(`Failed to start bridge: ${bridge}`, {
      cause: cause instanceof Error ? cause : undefined,
    });
  }
}

export class BridgeDispatchError extends WiringError {
  constructor(bridge: string, eventType: string, cause?: unknown) {
    super(`Bridge "${bridge}" failed to dispatch event type "${eventType}"`, {
      cause: cause instanceof Error ? cause : undefined,
    });
  }
}

export class ProjectionBridgeError extends WiringError {
  constructor(projectionName: string, cause?: unknown) {
    super(`Projection bridge failed for projection "${projectionName}"`, {
      cause: cause instanceof Error ? cause : undefined,
    });
  }
}

export class RegistryError extends WiringError {
  constructor(message: string) {
    super(message);
  }
}
