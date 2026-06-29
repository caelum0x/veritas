// Plugin host lifecycle manager — coordinates init, activate, and dispose across all loaded plugins.
import { ok, err, type Result } from "@veritas/core";
import type { Logger } from "@veritas/core";
import type { VerifierPlugin, PluginContext } from "@veritas/plugin-sdk";
import {
  initPlugin,
  activatePlugin,
  disposePlugin,
  getLifecycleStatus,
  type LifecycleStatus,
} from "@veritas/plugin-sdk";

/** Per-plugin record maintained by the host lifecycle layer. */
export interface HostPluginRecord {
  readonly plugin: VerifierPlugin;
  readonly context: PluginContext;
}

/** Result from a bulk lifecycle operation across multiple plugins. */
export interface BulkLifecycleResult {
  readonly succeeded: ReadonlyArray<string>;
  readonly failed: ReadonlyArray<{ pluginId: string; error: unknown }>;
}

/**
 * Initialize then activate a single plugin using its pre-built context.
 * Returns ok(void) on success or err on the first failing lifecycle step.
 */
export async function startPlugin(
  record: HostPluginRecord,
  logger: Logger,
): Promise<Result<void>> {
  const { plugin, context } = record;
  const log = logger.child({ pluginId: plugin.id });

  log.info("initializing plugin");
  const initResult = await initPlugin(plugin, context);
  if (!initResult.ok) {
    log.error("plugin init failed");
    return initResult;
  }

  log.info("activating plugin");
  const activateResult = await activatePlugin(plugin, context);
  if (!activateResult.ok) {
    log.error("plugin activation failed");
    return activateResult;
  }

  log.info("plugin started");
  return ok(undefined);
}

/**
 * Dispose a single plugin, logging errors but always resolving ok.
 * Never throws — ensures host teardown continues even if a plugin misbehaves.
 */
export async function stopPlugin(
  plugin: VerifierPlugin,
  logger: Logger,
): Promise<void> {
  const log = logger.child({ pluginId: plugin.id });
  log.info("disposing plugin");
  const result = await disposePlugin(plugin);
  if (!result.ok) {
    log.error("plugin dispose failed");
  } else {
    log.info("plugin disposed");
  }
}

/**
 * Start all plugins in the provided records, collecting successes and failures.
 * Continues regardless of individual failures (for resilient startup).
 */
export async function startAllPlugins(
  records: ReadonlyArray<HostPluginRecord>,
  logger: Logger,
): Promise<BulkLifecycleResult> {
  const succeeded: string[] = [];
  const failed: Array<{ pluginId: string; error: unknown }> = [];

  await Promise.all(
    records.map(async (record) => {
      const result = await startPlugin(record, logger);
      if (result.ok) {
        succeeded.push(record.plugin.id);
      } else {
        failed.push({ pluginId: record.plugin.id, error: result.error });
      }
    }),
  );

  return { succeeded, failed };
}

/**
 * Dispose all plugins in the provided array concurrently.
 * Always resolves — collects errors internally without re-throwing.
 */
export async function stopAllPlugins(
  plugins: ReadonlyArray<VerifierPlugin>,
  logger: Logger,
): Promise<void> {
  await Promise.all(plugins.map((p) => stopPlugin(p, logger)));
}

/** Return the current lifecycle status for every plugin in the list. */
export function allLifecycleStatuses(
  plugins: ReadonlyArray<VerifierPlugin>,
): ReadonlyArray<LifecycleStatus> {
  return plugins.map(getLifecycleStatus);
}
