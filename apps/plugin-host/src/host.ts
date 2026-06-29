// Plugin host — loads, wires, and runs verifier plugins within the host process.
import { ok, err, type Result } from "@veritas/core";
import { systemClock } from "@veritas/core";
import type { Logger } from "@veritas/core";
import {
  type VerifierPlugin,
  type PluginVerifyInput,
  type PluginContext,
  type PluginLoaderPort,
  type SandboxPolicy,
  loadPlugin,
} from "@veritas/plugin-sdk";
import type { PluginHostConfig } from "./config.js";
import { discoverFromConfig } from "./discovery.js";
import { makeHostApi } from "./host-services.js";
import { grantedCapabilitySet, mergePolicies } from "./isolation.js";
import {
  startAllPlugins,
  stopAllPlugins,
  allLifecycleStatuses,
  type HostPluginRecord,
  type BulkLifecycleResult,
} from "./lifecycle.js";
import {
  dispatchToAll,
  dispatchToPlugin,
  selectBestResult,
  type FanOutResult,
  type DispatchResult,
} from "./dispatch.js";

/** Runtime state held by the PluginHost. */
interface HostState {
  readonly plugins: Map<string, VerifierPlugin>;
  readonly contexts: Map<string, PluginContext>;
  running: boolean;
}

/** Primary class that owns the full plugin lifecycle. */
export class PluginHost {
  private readonly state: HostState = {
    plugins: new Map(),
    contexts: new Map(),
    running: false,
  };

  constructor(
    private readonly config: PluginHostConfig,
    private readonly loader: PluginLoaderPort,
    private readonly logger: Logger,
  ) {}

  /** Load all enabled plugins from config and start their lifecycles. */
  async start(): Promise<BulkLifecycleResult> {
    if (this.state.running) {
      return { succeeded: [], failed: [] };
    }

    const discoveryResult = discoverFromConfig(this.config.plugins);
    if (!discoveryResult.ok) {
      this.logger.error("plugin discovery failed");
      return { succeeded: [], failed: [] };
    }

    const records: HostPluginRecord[] = [];

    for (const descriptor of discoveryResult.value) {
      const loadResult = await loadPlugin(this.loader, {
        specifier: descriptor.specifier,
        config: descriptor.config,
      });

      if (!loadResult.ok) {
        this.logger.error("plugin load failed");
        if (!this.config.continueOnLoadError) break;
        continue;
      }

      const plugin = loadResult.value;
      const policy = this.resolvePolicy(descriptor.policyOverride);
      const ctx = this.buildContext(plugin, policy, descriptor.config);

      this.state.plugins.set(plugin.id, plugin);
      this.state.contexts.set(plugin.id, ctx);
      records.push({ plugin, context: ctx });
    }

    const result = await startAllPlugins(records, this.logger);
    this.state.running = true;
    return result;
  }

  /** Dispose all plugins and mark the host as stopped. */
  async stop(): Promise<void> {
    if (!this.state.running) return;
    await stopAllPlugins([...this.state.plugins.values()], this.logger);
    this.state.plugins.clear();
    this.state.contexts.clear();
    this.state.running = false;
  }

  /** Verify a claim by dispatching to all active plugins. */
  async verifyAll(input: PluginVerifyInput): Promise<FanOutResult> {
    return dispatchToAll(
      input,
      (plugin) => this.contextFor(plugin),
      this.state.plugins,
      this.logger,
    );
  }

  /** Verify a claim using the highest-scoring plugin result. */
  async verifyBest(input: PluginVerifyInput): Promise<Result<DispatchResult>> {
    const fanOut = await this.verifyAll(input);
    return selectBestResult(fanOut);
  }

  /** Dispatch to a specific plugin by id. */
  async verifyWith(
    pluginId: string,
    input: PluginVerifyInput,
  ): Promise<Result<DispatchResult>> {
    const ctx = this.state.contexts.get(pluginId);
    if (ctx === undefined) {
      return err(new Error(`Plugin context not found for "${pluginId}"`));
    }
    return dispatchToPlugin(pluginId, input, ctx, this.state.plugins, this.logger);
  }

  /** Return lifecycle status for all loaded plugins. */
  status() {
    return allLifecycleStatuses([...this.state.plugins.values()]);
  }

  /** Return true if the host has been started. */
  isRunning(): boolean {
    return this.state.running;
  }

  private contextFor(plugin: VerifierPlugin): PluginContext {
    return (
      this.state.contexts.get(plugin.id) ??
      this.buildContext(plugin, this.config.defaultPolicy, {})
    );
  }

  private resolvePolicy(override: unknown): SandboxPolicy {
    if (override !== undefined && override !== null) {
      return mergePolicies(this.config.defaultPolicy, override as Partial<SandboxPolicy>);
    }
    return this.config.defaultPolicy;
  }

  private buildContext(
    plugin: VerifierPlugin,
    policy: SandboxPolicy,
    config: Readonly<Record<string, unknown>>,
  ): PluginContext {
    const instanceId = `${plugin.id}@${systemClock.now()}`;
    const scopedLogger = this.logger.child({ pluginId: plugin.id, instanceId });
    const hostApi = makeHostApi({
      instanceId,
      policy,
      logger: scopedLogger,
    });
    return {
      instanceId,
      logger: scopedLogger,
      hostApi,
      policy,
      grantedCapabilities: grantedCapabilitySet(policy),
      config,
      activatedAt: systemClock.nowIso(),
    };
  }
}
