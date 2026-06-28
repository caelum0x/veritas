// LLM-provider-specific error types for @veritas/llm-providers
import { AppError } from "@veritas/core";

/** Raised when a provider backend reports an unsupported model or capability */
export class ProviderCapabilityError extends AppError {
  readonly kind = "ProviderCapability" as const;
  readonly providerName: string;
  readonly capability: string;

  constructor(providerName: string, capability: string, cause?: unknown) {
    super(
      "VALIDATION",
      422,
      `Provider "${providerName}" does not support capability: ${capability}`,
      { cause },
    );
    this.providerName = providerName;
    this.capability = capability;
  }
}

/** Raised when all providers in a failover chain have been exhausted */
export class AllProvidersExhaustedError extends AppError {
  readonly kind = "AllProvidersExhausted" as const;
  readonly attemptedProviders: ReadonlyArray<string>;

  constructor(attemptedProviders: ReadonlyArray<string>, cause?: unknown) {
    super(
      "UNAVAILABLE",
      503,
      `All providers exhausted: ${attemptedProviders.join(", ")}`,
      { cause },
    );
    this.attemptedProviders = attemptedProviders;
  }
}

/** Raised when a provider name is looked up but not found in the registry */
export class ProviderNotFoundError extends AppError {
  readonly kind = "ProviderNotFound" as const;
  readonly providerName: string;

  constructor(providerName: string) {
    super("NOT_FOUND", 404, `Provider not found in registry: "${providerName}"`);
    this.providerName = providerName;
  }
}

/** Raised when a provider configuration is missing or invalid */
export class ProviderConfigError extends AppError {
  readonly kind = "ProviderConfig" as const;
  readonly providerName: string;
  readonly field: string;

  constructor(providerName: string, field: string, cause?: unknown) {
    super(
      "VALIDATION",
      422,
      `Invalid configuration for provider "${providerName}": missing or invalid field "${field}"`,
      { cause },
    );
    this.providerName = providerName;
    this.field = field;
  }
}
