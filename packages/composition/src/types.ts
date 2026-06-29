// Shared types for the @veritas/composition package.

import type { Express, Router, RequestHandler } from "express";
import type { Logger } from "@veritas/observability";

/** A named sub-application that can be mounted under a base path. */
export interface MountableApp {
  readonly name: string;
  readonly basePath: string;
  readonly router: Router;
}

/** Options for building the composed Express server. */
export interface ComposeServerOptions {
  readonly apps: readonly MountableApp[];
  readonly middleware?: readonly RequestHandler[];
  readonly logger: Logger;
  readonly trustProxy?: boolean;
  readonly bodyLimitBytes?: number;
}

/** A factory that produces an Express application. */
export type AppFactory = (logger: Logger) => Express;

/** Registry entry describing a mountable application. */
export interface AppRegistryEntry {
  readonly name: string;
  readonly basePath: string;
  readonly factory: (logger: Logger) => Router;
  readonly tags?: readonly string[];
}

/** Result of assembling the server. */
export interface ComposedServer {
  readonly app: Express;
  readonly mountedPaths: readonly string[];
}

/** A background worker that can be started and stopped. */
export interface Worker {
  readonly name: string;
  start(): Promise<void>;
  stop(): Promise<void>;
}

/** Options for composing a set of workers. */
export interface WorkerCompositionOptions {
  readonly workers: readonly Worker[];
  readonly logger: Logger;
  /** If true, a worker start failure does not abort others. Default: false. */
  readonly continueOnError?: boolean;
}

/** Lifecycle component: anything that can be started and stopped. */
export interface Lifecycle {
  start(): Promise<void>;
  stop(): Promise<void>;
}

/** Options for the graceful shutdown coordinator. */
export interface GracefulShutdownOptions {
  readonly components: readonly Lifecycle[];
  readonly logger: Logger;
  /** Maximum time in ms to wait for all components to stop. Default: 10_000. */
  readonly timeoutMs?: number;
}
