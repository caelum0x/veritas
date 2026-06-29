// Bootstrap: wire all plugin-host dependencies and start the host process.
import type { Logger } from "@veritas/core";
import type { VerifierPlugin, PluginContext, SandboxPolicy } from "@veritas/plugin-sdk";
import {
  InMemoryPluginLoader,
  loadPlugin,
  openDevPolicy,
} from "@veritas/plugin-sdk";
import { createLogger } from "@veritas/observability";
import { type PluginHostConfig, defaultPluginHostConfig } from "./config.js";
import { discoverFromConfig, type DiscoveredPlugin } from "./discovery.js";
import { makeHostApi } from "./host-services.js";
import { startAllPlugins, stopAllPlugins, type HostPluginRecord } from "./lifecycle.js";
import { mergePolicies, grantedCapabilitySet } from "./isolation.js";
import { HostBootstrapError } from "./errors.js";

/** Runtime state managed by a running plugin host. */
export interface PluginHostRuntime {
  readonly plugins: ReadonlyMap<string, VerifierPlugin>;
  readonly records: ReadonlyArray<HostPluginRecord>;
  readonly logger: Logger;
  /** Shut down all active plugins and release resources. */
  shutdown(): Promise<void>;
}

/** Options accepted by bootstrapHost. */
export interface BootstrapOptions {
  readonly config?: PluginHostConfig;
  readonly logger?: Logger;
  /** Pre-registered plugins for testing / embedded mode. */
  readonly preloadedPlugins?: ReadonlyArray<VerifierPlugin>;
}

/**
 * Wire the plugin host: discover, load, and start all configured plugins.
 * Returns a PluginHostRuntime ready to accept verification dispatch.
 */
export async function bootstrapHost(opts: BootstrapOptions = {}): Promise<PluginHostRuntime> {
  const config = opts.config ?? defaultPluginHostConfig();
  const logger = opts.logger ?? createLogger({ level: "info", bindings: { service: "plugin-host" } });

  const discoveryResult = discoverFromConfig(config.plugins);
  if (!discoveryResult.ok) {
    throw new HostBootstrapError(`Discovery failed: ${String(discoveryResult.error)}`);
  }

  const discovered: ReadonlyArray<DiscoveredPlugin> = discoveryResult.value;

  const loader = new InMemoryPluginLoader(opts.preloadedPlugins ?? []);
  const pluginMap = new Map<string, VerifierPlugin>();
  const records: HostPluginRecord[] = [];

  for (const desc of discovered) {
    const loadResult = await loadPlugin(loader, { specifier: desc.specifier, config: desc.config });
    if (!loadResult.ok) {
      logger.warn("failed to load plugin", { specifier: desc.specifier, error: String(loadResult.error) });
      if (!config.continueOnLoadError) {
        throw new HostBootstrapError(`Failed to load plugin "${desc.specifier}": ${String(loadResult.error)}`);
      }
      continue;
    }

    const plugin = loadResult.value;
    const policyOverride = desc.policyOverride as Partial<SandboxPolicy> | undefined;
    const effectivePolicy = policyOverride
      ? mergePolicies(config.defaultPolicy, policyOverride)
      : config.defaultPolicy;

    const hostApi = makeHostApi({
      instanceId: plugin.id,
      policy: effectivePolicy,
      logger: logger.child({ pluginId: plugin.id }),
    });

    const ctx: PluginContext = {
      instanceId: plugin.id,
      logger: logger.child({ pluginId: plugin.id }),
      hostApi,
      policy: effectivePolicy,
      grantedCapabilities: grantedCapabilitySet(effectivePolicy),
      config: Object.freeze({ ...(desc.config as Record<string, unknown>) }),
      activatedAt: new Date().toISOString(),
    };

    pluginMap.set(plugin.id, plugin);
    records.push({ plugin, context: ctx });
  }

  const startResult = await startAllPlugins(records, logger);
  if (startResult.failed.length > 0) {
    startResult.failed.forEach(({ pluginId, error }) => {
      logger.error("plugin failed to start", { pluginId, error: String(error) });
    });
    if (!config.continueOnLoadError && startResult.succeeded.length === 0) {
      throw new HostBootstrapError("All plugins failed to start");
    }
  }

  logger.info("plugin host bootstrap complete", {
    started: startResult.succeeded.length,
    failed: startResult.failed.length,
  });

  return {
    plugins: pluginMap,
    records,
    logger,
    async shutdown(): Promise<void> {
      logger.info("plugin host shutting down");
      await stopAllPlugins([...pluginMap.values()], logger);
      logger.info("plugin host stopped");
    },
  };
}
