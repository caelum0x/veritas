// Start the Veritas CAP provider: connects to the CROO relay and serves verification orders.

import { loadConfig } from "@veritas/config";
import { noopLogger } from "@veritas/core";
import { createVeritasProvider } from "@veritas/cap/provider.js";
import type { CapProviderConfig } from "@veritas/cap";
import { MockProvider } from "@veritas/llm";
import type { EngineOptions } from "@veritas/verification";

/** Build a CapProviderConfig from loaded application configuration. */
function buildCapConfig(
  croo: ReturnType<typeof loadConfig>["croo"],
): CapProviderConfig {
  return {
    agentUrl: croo.rpcUrl,
    agentId: croo.agentId,
    privateKey: croo.agentPrivateKey,
    walletAddress: croo.usdcAddress,
    networkId: String(croo.chainId),
    maxReconnectAttempts: 10,
    reconnectBaseDelayMs: 1_000,
  };
}

/** Build minimal EngineOptions using the MockProvider for demonstration. */
function buildEngineOptions(): EngineOptions {
  return {
    llm: new MockProvider(),
    logger: noopLogger,
    concurrency: 4,
    maxClaims: 20,
    verifier: "veritas-cap-provider",
    verifierVersion: "1.0.0",
    effort: "standard",
  };
}

async function main(): Promise<void> {
  console.log("=== Veritas CAP Provider ===");

  let config: ReturnType<typeof loadConfig>;
  try {
    config = loadConfig();
  } catch (e: unknown) {
    console.error(
      "Configuration error:",
      e instanceof Error ? e.message : String(e),
    );
    process.exit(1);
  }

  const capConfig = buildCapConfig(config.croo);
  const engineOptions = buildEngineOptions();

  const provider = createVeritasProvider({
    config: capConfig,
    engineOptions,
    logger: noopLogger,
    reconnectOptions: {
      maxAttempts: 10,
      baseDelayMs: 1_000,
      maxDelayMs: 30_000,
      jitter: 0.2,
    },
  });

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`\n[cap-provider] Received ${signal} — shutting down gracefully…`);
    try {
      await provider.stop();
      const snap = provider.metrics.snapshot();
      console.log(
        `[cap-provider] Final metrics: orders=${snap.ordersCompleted}, ` +
          `verifications=${snap.verificationsSucceeded}, ` +
          `earned=${provider.settlements.totalEarned().toString()} USDC`,
      );
    } finally {
      process.exit(0);
    }
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));

  console.log(`[cap-provider] Connecting to ${capConfig.agentUrl} as ${capConfig.agentId}`);

  try {
    await provider.start();
    console.log("[cap-provider] Running — awaiting CAP orders.");
    // Keep process alive; the event loop and WebSocket drive forward progress.
    await new Promise<never>(() => undefined);
  } catch (e: unknown) {
    console.error(
      "[cap-provider] Fatal error:",
      e instanceof Error ? e.message : String(e),
    );
    process.exit(1);
  }
}

main().catch((err: unknown) => {
  console.error("run-cap-provider failed:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
