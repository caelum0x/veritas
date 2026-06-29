// Registers the CAP (CROO Agent Protocol) provider and its runtime dependencies into the DI container.

import type { Container } from "../container.js";
import {
  LOGGER,
  ENGINE_OPTIONS,
  CAP_PROVIDER,
  CAP_CONFIG,
} from "../tokens.js";
import { createVeritasProvider } from "@veritas/cap/provider.js";
import type { VeritasProvider, VeritasProviderOptions } from "@veritas/cap/provider.js";
import type { CapProviderConfig } from "@veritas/cap";
import type { EngineOptions } from "@veritas/verification";
import { noopLogger } from "@veritas/core";
import type { Logger } from "@veritas/core";

/**
 * Wire the CAP VeritasProvider.
 * Requires TOKENS.EngineOptions and TOKENS.CapConfig to already be registered.
 * The provider is created in stopped state; callers invoke `.start()` explicitly.
 */
export function registerCapModule(container: Container): void {
  container.singleton(CAP_PROVIDER, (c): VeritasProvider => {
    const engineOptions = c.resolve<EngineOptions>(ENGINE_OPTIONS);
    const config = c.resolve<CapProviderConfig>(CAP_CONFIG);
    const logger = c.tryResolve<Logger>(LOGGER) ?? noopLogger;

    // Optional policy and reconnect knobs surfaced from CapConfig extensions.
    const rawCfg = config as CapProviderConfig & Record<string, unknown>;

    const options: VeritasProviderOptions = {
      config,
      engineOptions,
      logger,
      policyConfig:
        typeof rawCfg["policyConfig"] === "object" && rawCfg["policyConfig"] !== null
          ? (rawCfg["policyConfig"] as VeritasProviderOptions["policyConfig"])
          : undefined,
      reconnectOptions:
        typeof rawCfg["reconnectOptions"] === "object" && rawCfg["reconnectOptions"] !== null
          ? (rawCfg["reconnectOptions"] as VeritasProviderOptions["reconnectOptions"])
          : {
              maxAttempts: config.maxReconnectAttempts ?? 5,
              baseDelayMs: config.reconnectBaseDelayMs ?? 1000,
            },
    };

    return createVeritasProvider(options);
  });
}
