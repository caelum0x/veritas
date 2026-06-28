// HostApi implementation provided to plugins by the plugin host process.
import { ok, err, type Result } from "@veritas/core";
import type { Logger } from "@veritas/core";
import {
  type HostApi,
  type PluginKvStore,
  type FetchOptions,
  type FetchResponse,
  type PluginEvent,
  type SandboxPolicy,
  type CapabilityKind,
  CapabilityKind as Cap,
} from "@veritas/plugin-sdk";
import { checkCapability, checkHost } from "./isolation.js";

/** Build a HostApi instance scoped to one plugin instance. */
export function makeHostApi(opts: {
  readonly instanceId: string;
  readonly policy: SandboxPolicy;
  readonly logger: Logger;
  readonly eventSink?: (event: PluginEvent) => Promise<void>;
}): HostApi {
  const { instanceId, policy, logger, eventSink } = opts;
  const kvStore = new InProcessKvStore();

  return {
    getLogger(name: string): Logger {
      return logger.child({ name, instanceId });
    },

    kv: kvStore,

    async fetch(url: string, options?: FetchOptions): Promise<Result<FetchResponse>> {
      const capCheck = checkCapability(policy, Cap.HTTP_EGRESS as CapabilityKind);
      if (!capCheck.ok) return capCheck;

      let hostname: string;
      try {
        hostname = new URL(url).hostname;
      } catch {
        return err(new Error(`Invalid URL: ${url}`));
      }

      const hostCheck = checkHost(policy, hostname);
      if (!hostCheck.ok) return hostCheck;

      try {
        const ctrl = new AbortController();
        const timeoutMs = options?.timeoutMs ?? policy.network.requestTimeoutMs;
        const timer = setTimeout(() => ctrl.abort(), timeoutMs);

        const res = await fetch(url, {
          method: options?.method ?? "GET",
          headers: options?.headers as Record<string, string> | undefined,
          body: options?.body,
          signal: ctrl.signal,
        });

        clearTimeout(timer);

        const body = await res.text();
        const headers: Record<string, string> = {};
        res.headers.forEach((v, k) => { headers[k] = v; });

        return ok({ status: res.status, headers: Object.freeze(headers), body });
      } catch (e) {
        return err(e instanceof Error ? e : new Error(String(e)));
      }
    },

    async emitEvent(event: PluginEvent): Promise<Result<void>> {
      const capCheck = checkCapability(policy, Cap.EVENT_EMIT as CapabilityKind);
      if (!capCheck.ok) return capCheck;
      if (!policy.allowEventEmit) {
        return err(new Error("Plugin is not permitted to emit events"));
      }
      if (eventSink) {
        await eventSink(event);
      }
      return ok(undefined);
    },

    now(): string {
      return new Date().toISOString();
    },

    hasCapability(kind: CapabilityKind): boolean {
      return policy.grantedCapabilities.includes(kind);
    },
  };
}

/** Simple in-process key-value store backed by a Map. */
class InProcessKvStore implements PluginKvStore {
  private readonly store = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
}
