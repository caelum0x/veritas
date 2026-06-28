// Public surface of @veritas/composition — re-exports all composition utilities.

export type {
  MountableApp,
  ComposeServerOptions,
  AppFactory,
  AppRegistryEntry,
  ComposedServer,
  Worker,
  WorkerCompositionOptions,
  Lifecycle,
  GracefulShutdownOptions,
} from "./types.js";

export { composeServer } from "./compose-server.js";
export { mountApp, mountAll } from "./mount.js";
export { AppRegistry } from "./app-registry.js";
export { mergeRouters, wrapRouter, composeRouters } from "./router-composition.js";
export type { RouterMergeOptions } from "./router-composition.js";
export { applyMiddlewareStack } from "./middleware-stack.js";
export type { MiddlewareStackOptions } from "./middleware-stack.js";
export {
  DuplicatePathError,
  DuplicateAppNameError,
  InvalidBasePathError,
  AppNotFoundError,
  WorkerStartError,
  WorkerStopError,
  ShutdownTimeoutError,
  LifecycleStartError,
} from "./errors.js";
