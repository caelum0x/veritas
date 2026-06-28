// Plugin-host-specific error classes extending @veritas/core AppError hierarchy.
import { AppError, type AppErrorOptions } from "@veritas/core";

/** Raised when the host fails to discover a plugin at a given path or specifier. */
export class PluginDiscoveryError extends AppError {
  constructor(message: string, opts?: AppErrorOptions) {
    super("INTERNAL", 500, message, opts);
    this.name = "PluginDiscoveryError";
  }
}

/** Raised when the host receives a dispatch request for an unknown plugin id. */
export class PluginDispatchError extends AppError {
  constructor(message: string, opts?: AppErrorOptions) {
    super("INTERNAL", 500, message, opts);
    this.name = "PluginDispatchError";
  }
}

/** Raised when an isolation policy check blocks a plugin action. */
export class IsolationViolationError extends AppError {
  constructor(message: string, opts?: AppErrorOptions) {
    super("FORBIDDEN", 403, message, opts);
    this.name = "IsolationViolationError";
  }
}

/** Raised when host bootstrap encounters a fatal configuration problem. */
export class HostBootstrapError extends AppError {
  constructor(detail: string, opts?: AppErrorOptions) {
    super("INTERNAL", 500, `Host bootstrap failed: ${detail}`, opts);
    this.name = "HostBootstrapError";
  }
}

/** Raised when a host service operation violates the declared sandbox policy. */
export class HostPolicyViolationError extends AppError {
  constructor(detail: string, opts?: AppErrorOptions) {
    super("FORBIDDEN", 403, `Host policy violation: ${detail}`, opts);
    this.name = "HostPolicyViolationError";
  }
}
