import 'dotenv/config';
import { loadConfig } from './config.js';
import { createLogger } from './logger.js';
import { createAgentClient } from './croo/client.js';
import { VeritasProvider } from './croo/provider.js';
import { createAnthropicVerifier } from './llm/anthropic.js';
import type { EngineOptions } from './verify/engine.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger(config.logLevel);

  const llm = createAnthropicVerifier({
    apiKey: config.anthropic.apiKey,
    model: config.verify.model,
    effort: config.verify.effort,
    maxSearches: config.verify.maxSearches,
    logger,
  });

  const engine: EngineOptions = {
    llm,
    logger,
    model: config.verify.model,
    effort: config.verify.effort,
    maxClaims: config.verify.maxClaims,
    concurrency: config.verify.concurrency,
  };

  const client = createAgentClient(config, logger);
  const provider = new VeritasProvider({ client, config, logger, engine });

  await provider.start();

  const shutdown = (signal: string) => {
    logger.info('shutting down', { signal });
    provider.stop();
    process.exit(0);
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  // Startup errors (bad config, etc.) — print plainly and exit non-zero.
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
