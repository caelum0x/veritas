// Plugin-SDK error classes for plugin lifecycle and loading failures.

/** Raised when a plugin manifest fails validation. */
export class PluginManifestError extends Error {
  readonly code = "PLUGIN_MANIFEST_INVALID" as const;
  constructor(message: string) {
    super(message);
    this.name = "PluginManifestError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Raised when the plugin registry cannot find a registered plugin. */
export class PluginNotFoundError extends Error {
  readonly code = "PLUGIN_NOT_FOUND" as const;
  constructor(pluginId: string) {
    super(`Plugin not found: ${pluginId}`);
    this.name = "PluginNotFoundError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Raised when a plugin with the same id is already registered. */
export class PluginConflictError extends Error {
  readonly code = "PLUGIN_ALREADY_REGISTERED" as const;
  constructor(pluginId: string) {
    super(`Plugin already registered: ${pluginId}`);
    this.name = "PluginConflictError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** @deprecated Use PluginConflictError. */
export const PluginAlreadyRegisteredError = PluginConflictError;

/** Raised when a plugin's initialize or activate step fails. */
export class PluginLifecycleError extends Error {
  readonly code = "PLUGIN_LIFECYCLE_ERROR" as const;
  constructor(pluginId: string, detail: string) {
    super(`Plugin "${pluginId}" lifecycle error: ${detail}`);
    this.name = "PluginLifecycleError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Raised when the dynamic plugin loader cannot resolve a module path. */
export class PluginLoadError extends Error {
  readonly code = "PLUGIN_LOAD_ERROR" as const;
  constructor(specifier: string, detail: string) {
    super(`Failed to load plugin "${specifier}": ${detail}`);
    this.name = "PluginLoadError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Raised when plugin execution exceeds its sandbox resource limits. */
export class PluginSandboxViolationError extends Error {
  readonly code = "PLUGIN_SANDBOX_VIOLATION" as const;
  constructor(detail: string) {
    super(`Sandbox violation: ${detail}`);
    this.name = "PluginSandboxViolationError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Raised when a capability declared by a plugin is not supported by the host. */
export class PluginCapabilityError extends Error {
  readonly code = "PLUGIN_CAPABILITY_UNSUPPORTED" as const;
  constructor(capability: string) {
    super(`Unsupported capability: ${capability}`);
    this.name = "PluginCapabilityError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
