// Production CAP provider entrypoint: bootstraps the agent and runs the supervisor.

import { bootstrap } from "./bootstrap.js";
import { attachShutdownHandlers } from "./shutdown.js";
import { runSupervisor } from "./runtime.js";

export async function main(): Promise<void> {
  const { provider, logger, config } = bootstrap();

  logger.info("cap-agent: starting", {
    agentId: config.croo.agentId,
    chainId: config.croo.chainId,
    simulate: config.croo.simulate,
    logLevel: config.observability.logLevel,
  });

  const shutdownCtl = attachShutdownHandlers(provider, logger);

  shutdownCtl.onShutdown(async () => {
    logger.info("cap-agent: final metrics", {
      metrics: provider.metrics.snapshot(),
    });
  });

  try {
    await runSupervisor(provider, logger, {
      healthLogIntervalMs: 60_000,
      maxStartRetries: 3,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("cap-agent: fatal error in supervisor", { error: message });
    process.exit(1);
  }
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  // eslint-disable-next-line no-console
  console.error("[cap-agent] fatal:", message);
  process.exit(1);
});
