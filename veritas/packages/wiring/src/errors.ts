// Wiring-layer error types for container build and registration failures.

/** Thrown when a required token cannot be resolved during container construction. */
export class WiringError extends Error {
  readonly code = "WIRING_ERROR" as const;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, { cause: options?.cause });
    this.name = "WiringError";
  }
}

/** Thrown when a required configuration value is missing or invalid at wiring time. */
export class ConfigurationError extends Error {
  readonly code = "CONFIGURATION_ERROR" as const;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, { cause: options?.cause });
    this.name = "ConfigurationError";
  }
}

/** Thrown when a provider (LLM, CAP, payment) fails to initialize. */
export class ProviderInitError extends Error {
  readonly code = "PROVIDER_INIT_ERROR" as const;
  readonly provider: string;

  constructor(provider: string, cause?: unknown) {
    super(`Failed to initialize provider: ${provider}`, { cause });
    this.name = "ProviderInitError";
    this.provider = provider;
  }
}
