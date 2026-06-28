import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { loadConfig } from './config.js';
import { createLogger } from './logger.js';
import { createAnthropicVerifier } from './llm/anthropic.js';
import { runVerification, type EngineOptions } from './verify/engine.js';
import { VerificationRequestSchema } from './verify/schema.js';

/**
 * Local verification harness — runs the engine directly, bypassing CAP. Useful
 * for development and for the demo video to show the verification output without
 * an on-chain round-trip.
 *
 *   npm run verify:local -- ./request.json
 *   echo '{"claims":["The Eiffel Tower is in Paris."]}' | npm run verify:local
 */
async function main(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger(config.logLevel);

  const fileArg = process.argv[2];
  const raw = fileArg ? readFileSync(fileArg, 'utf8') : readFileSync(0, 'utf8');
  const request = VerificationRequestSchema.parse(JSON.parse(raw));

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

  const report = await runVerification(request, engine);
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
}

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
