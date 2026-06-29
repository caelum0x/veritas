// Wire the CAP provider from config and observability dependencies.

import { loadConfig } from "@veritas/config";
import type { AppConfig } from "@veritas/config";
import { createLogger } from "@veritas/observability";
import type { Logger } from "@veritas/core";
import { createVeritasProvider } from "@veritas/cap/provider.js";
import type { VeritasProvider } from "@veritas/cap/provider.js";
import type { CapProviderConfig } from "@veritas/cap";
import { MockProvider } from "@veritas/llm";
import type { EngineOptions } from "@veritas/verification";

/** All runtime objects produced by bootstrap. */
export interface BootstrappedAgent {
  readonly provider: VeritasProvider;
  readonly logger: Logger;
  readonly config: AppConfig;
}

/**
 * Load config, build logger, assemble EngineOptions, and create the CAP provider.
 * Throws immediately if any required environment variable is missing.
 */
export function bootstrap(): BootstrappedAgent {
  const config = loadConfig();

  const logger = createLogger({
    level: config.observability.logLevel ?? "info",
    bindings: { service: "cap-agent" },
  });

  const capConfig = buildCapProviderConfig(config);
  const engineOptions = buildEngineOptions(logger);
  const provider = createVeritasProvider({
    config: capConfig,
    engineOptions,
    logger,
    reconnectOptions: {
      maxAttempts: 10,
      baseDelayMs: 1_000,
      maxDelayMs: 30_000,
      jitter: 0.2,
    },
  });

  return { provider, logger, config };
}

/** Map the croo section of AppConfig to CapProviderConfig. */
function buildCapProviderConfig(config: AppConfig): CapProviderConfig {
  return {
    agentUrl: config.croo.rpcUrl,
    agentId: config.croo.agentId,
    privateKey: config.croo.agentPrivateKey,
    walletAddress: config.croo.usdcAddress,
    networkId: String(config.croo.chainId),
    maxReconnectAttempts: 10,
    reconnectBaseDelayMs: 1_000,
  };
}

/** Build default EngineOptions using a MockProvider; real provider overridden at deploy. */
function buildEngineOptions(logger: Logger): EngineOptions {
  const llm = new MockProvider();
  return {
    llm,
    logger,
    concurrency: 4,
    effort: "standard",
    verifier: "veritas",
    verifierVersion: "1.0.0",
  };
}
