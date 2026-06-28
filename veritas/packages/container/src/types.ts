// Container type definitions: service token types, factory signatures, and registration interfaces.

import type { Logger } from "@veritas/core";

/** A factory function that resolves a service from the container. */
export type Factory<T> = (resolve: Resolver) => T;

/** A factory function that resolves a service asynchronously. */
export type AsyncFactory<T> = (resolve: Resolver) => Promise<T>;

/** Resolves a registered service by its token. */
export type Resolver = <T>(token: Token<T>) => T;

/** Async resolver that supports async factories. */
export type AsyncResolver = <T>(token: Token<T>) => Promise<T>;

/** Opaque token used to identify a service registration. */
export interface Token<T> {
  readonly name: string;
  readonly _type?: T; // phantom type for inference
}

/** Creates a typed DI token. */
export function token<T>(name: string): Token<T> {
  return { name } as Token<T>;
}

/** Lifecycle of a registered service. */
export type Lifecycle = "singleton" | "transient";

/** A resolved or factory-backed registration entry. */
export type Registration<T> =
  | { kind: "value"; value: T }
  | { kind: "factory"; factory: Factory<T>; lifecycle: Lifecycle }
  | { kind: "asyncFactory"; factory: AsyncFactory<T>; lifecycle: Lifecycle };

/** Options for registering a service. */
export interface RegisterOptions {
  lifecycle?: Lifecycle;
}

/** Container interface exposed to consuming modules. */
export interface IContainer {
  /** Register a constant value. */
  registerValue<T>(token: Token<T>, value: T): void;

  /** Register a synchronous factory. */
  register<T>(
    token: Token<T>,
    factory: Factory<T>,
    options?: RegisterOptions
  ): void;

  /** Register an asynchronous factory. */
  registerAsync<T>(
    token: Token<T>,
    factory: AsyncFactory<T>,
    options?: RegisterOptions
  ): void;

  /** Resolve a service synchronously (throws if async factory). */
  resolve<T>(token: Token<T>): T;

  /** Resolve a service asynchronously. */
  resolveAsync<T>(token: Token<T>): Promise<T>;

  /** Check whether a token is registered. */
  has<T>(token: Token<T>): boolean;
}

/** Module installer — receives the container and wires its services. */
export type Module = (container: IContainer) => void;

/** Async module installer. */
export type AsyncModule = (container: IContainer) => Promise<void>;

/** Context passed to build-container to configure the DI graph. */
export interface ContainerBuildContext {
  logger: Logger;
  env: Record<string, string | undefined>;
}
