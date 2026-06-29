// Claim dispatch — routes incoming verification requests to the appropriate plugin(s).
import { ok, err, type Result } from "@veritas/core";
import type { Logger } from "@veritas/core";
import {
  type VerifierPlugin,
  type PluginVerifyInput,
  type PluginResult,
  type PluginContext,
  isActive,
} from "@veritas/plugin-sdk";
import { PluginDispatchError } from "./errors.js";

/** A single dispatched result paired with the plugin that produced it. */
export interface DispatchResult {
  readonly pluginId: string;
  readonly result: PluginResult;
}

/** Summary from a fan-out dispatch across multiple plugins. */
export interface FanOutResult {
  readonly results: ReadonlyArray<DispatchResult>;
  readonly errors: ReadonlyArray<{ pluginId: string; error: unknown }>;
}

/**
 * Dispatch a verification request to a specific plugin by id.
 * Returns err if the plugin is not found, not active, or verify() fails.
 */
export async function dispatchToPlugin(
  pluginId: string,
  input: PluginVerifyInput,
  ctx: PluginContext,
  plugins: ReadonlyMap<string, VerifierPlugin>,
  logger: Logger,
): Promise<Result<DispatchResult>> {
  const plugin = plugins.get(pluginId);
  if (plugin === undefined) {
    return err(
      new PluginDispatchError(`No plugin registered with id "${pluginId}"`),
    );
  }

  if (!isActive(plugin)) {
    return err(
      new PluginDispatchError(
        `Plugin "${pluginId}" is not in the active state`,
      ),
    );
  }

  const log = logger.child({ pluginId, claim: input.claim.slice(0, 80) });
  log.info("dispatching verify");

  const verifyResult = await plugin.verify(input, ctx);
  if (!verifyResult.ok) {
    log.error("verify returned err");
    return err(verifyResult.error);
  }

  log.info("verify succeeded");
  return ok({ pluginId, result: verifyResult.value });
}

/**
 * Fan out a verification request to all active plugins in the registry.
 * Always resolves — individual plugin errors are collected in FanOutResult.errors.
 */
export async function dispatchToAll(
  input: PluginVerifyInput,
  ctxFactory: (plugin: VerifierPlugin) => PluginContext,
  plugins: ReadonlyMap<string, VerifierPlugin>,
  logger: Logger,
): Promise<FanOutResult> {
  const active = [...plugins.values()].filter(isActive);

  if (active.length === 0) {
    logger.warn("dispatch fan-out: no active plugins");
    return { results: [], errors: [] };
  }

  const settled = await Promise.allSettled(
    active.map(async (plugin) => {
      const ctx = ctxFactory(plugin);
      const res = await dispatchToPlugin(plugin.id, input, ctx, plugins, logger);
      if (!res.ok) throw res.error;
      return res.value;
    }),
  );

  const results: DispatchResult[] = [];
  const errors: Array<{ pluginId: string; error: unknown }> = [];

  settled.forEach((outcome, i) => {
    const pluginId = active[i]!.id;
    if (outcome.status === "fulfilled") {
      results.push(outcome.value);
    } else {
      errors.push({ pluginId, error: outcome.reason });
    }
  });

  return { results, errors };
}

/**
 * Select the best result from a fan-out by highest score.
 * Returns err if results array is empty.
 */
export function selectBestResult(
  fanOut: FanOutResult,
): Result<DispatchResult> {
  if (fanOut.results.length === 0) {
    return err(new PluginDispatchError("No plugin produced a result"));
  }
  const best = [...fanOut.results].sort((a, b) => b.result.score - a.result.score)[0]!;
  return ok(best);
}
