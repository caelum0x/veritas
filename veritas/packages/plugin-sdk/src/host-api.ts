// HostApi: the platform surface the host exposes to loaded plugin instances.

import type { Result } from "@veritas/core";
import type { Logger } from "@veritas/core";
import type { CapabilityKind } from "./capability.js";

/** A key/value store scoped to the owning plugin instance. */
export interface PluginKvStore {
  /** Retrieve a previously stored string value by key, or null if absent. */
  get(key: string): Promise<string | null>;
  /** Persist a string value under the given key (last write wins). */
  set(key: string, value: string): Promise<void>;
  /** Remove the entry for the given key (no-op if absent). */
  delete(key: string): Promise<void>;
}

/** A single HTTP response from an egress fetch. */
export interface FetchResponse {
  readonly status: number;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: string;
}

/** Options for plugin-initiated HTTP egress requests. */
export interface FetchOptions {
  readonly method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  readonly headers?: Readonly<Record<string, string>>;
  readonly body?: string;
  readonly timeoutMs?: number;
}

/** Lightweight event payload emitted by a plugin into the platform bus. */
export interface PluginEvent {
  /** Event type discriminator in "plugin.<plugin-id>.<event>" format. */
  readonly type: string;
  /** Arbitrary serializable payload. */
  readonly payload: Readonly<Record<string, unknown>>;
  /** ISO-8601 timestamp set by the plugin at emission time. */
  readonly occurredAt: string;
}

/**
 * The API the host exposes to each plugin instance at runtime.
 * All methods are async to allow the host to apply rate limits, audit logging,
 * and capability enforcement transparently.
 */
export interface HostApi {
  /**
   * Return a logger pre-bound to the plugin's instanceId and pluginId.
   * Prefer this over the context logger when creating named sub-loggers.
   */
  getLogger(name: string): Logger;

  /**
   * Key/value store scoped to this plugin instance.
   * Requires the STORAGE_ACCESS capability.
   */
  kv: PluginKvStore;

  /**
   * Perform an outbound HTTP request subject to the sandbox network policy.
   * Requires the HTTP_EGRESS capability; blocked hosts return an Err.
   */
  fetch(url: string, options?: FetchOptions): Promise<Result<FetchResponse>>;

  /**
   * Emit a structured event into the platform domain event bus.
   * Requires the EVENT_EMIT capability.
   */
  emitEvent(event: PluginEvent): Promise<Result<void>>;

  /**
   * Resolve the current wall-clock time as an ISO-8601 string.
   * Always succeeds; provided so plugins avoid direct Date usage.
   */
  now(): string;

  /**
   * Check whether a given capability kind has been granted to this plugin.
   * Does not require any capability itself.
   */
  hasCapability(kind: CapabilityKind): boolean;
}

/** In-memory HostApi implementation used in tests and local development. */
export class InMemoryHostApi implements HostApi {
  private readonly store: Map<string, string> = new Map();
  private readonly grantedCapabilities: ReadonlySet<CapabilityKind>;
  private readonly emittedEvents: PluginEvent[] = [];
  private readonly loggerFactory: (name: string) => Logger;

  constructor(opts: {
    grantedCapabilities?: ReadonlySet<CapabilityKind>;
    loggerFactory?: (name: string) => Logger;
  } = {}) {
    this.grantedCapabilities = opts.grantedCapabilities ?? new Set();
    this.loggerFactory = opts.loggerFactory ?? defaultLoggerFactory;
  }

  getLogger(name: string): Logger {
    return this.loggerFactory(name);
  }

  kv: PluginKvStore = {
    get: async (key) => this.store.get(key) ?? null,
    set: async (key, value) => { this.store.set(key, value); },
    delete: async (key) => { this.store.delete(key); },
  };

  async fetch(_url: string, _options?: FetchOptions): Promise<Result<FetchResponse>> {
    return { ok: false, error: new Error("InMemoryHostApi: HTTP egress not available") };
  }

  async emitEvent(event: PluginEvent): Promise<Result<void>> {
    this.emittedEvents.push(event);
    return { ok: true, value: undefined };
  }

  now(): string {
    return new Date().toISOString();
  }

  hasCapability(kind: CapabilityKind): boolean {
    return this.grantedCapabilities.has(kind);
  }

  /** Inspect emitted events (test helper). */
  getEmittedEvents(): ReadonlyArray<PluginEvent> {
    return this.emittedEvents;
  }
}

/** Minimal no-op logger used by the InMemoryHostApi by default. */
function defaultLoggerFactory(name: string): Logger {
  const noop = (): void => {};
  const logger: Logger = {
    debug: noop,
    info: noop,
    warn: noop,
    error: noop,
    child: () => logger,
  };
  void name;
  return logger;
}
