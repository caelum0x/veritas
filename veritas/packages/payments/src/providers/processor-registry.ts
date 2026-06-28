// Registry that maps processor names to PaymentProcessor port implementations.

import type { PaymentProcessor } from "../processor.js";

/** Holds registered processor implementations keyed by name. */
export class ProcessorRegistry {
  private readonly processors: Map<string, PaymentProcessor> = new Map();
  private defaultName: string | undefined;

  /** Register a processor under a given name; optionally mark as default. */
  register(name: string, processor: PaymentProcessor, isDefault = false): this {
    this.processors.set(name, processor);
    if (isDefault || this.processors.size === 1) {
      this.defaultName = name;
    }
    return this;
  }

  /** Retrieve a processor by name, or throw if not found. */
  get(name: string): PaymentProcessor {
    const proc = this.processors.get(name);
    if (proc === undefined) {
      throw new Error(`PaymentProcessor "${name}" is not registered`);
    }
    return proc;
  }

  /** Return the default processor, or throw if none registered. */
  getDefault(): PaymentProcessor {
    if (this.defaultName === undefined) {
      throw new Error("No default PaymentProcessor registered");
    }
    return this.get(this.defaultName);
  }

  /** Check whether a processor is registered under the given name. */
  has(name: string): boolean {
    return this.processors.has(name);
  }

  /** Return all registered processor names. */
  names(): ReadonlyArray<string> {
    return Array.from(this.processors.keys());
  }

  /** Remove a processor by name; returns true if it existed. */
  unregister(name: string): boolean {
    const removed = this.processors.delete(name);
    if (removed && this.defaultName === name) {
      this.defaultName = this.processors.keys().next().value;
    }
    return removed;
  }
}

/** Singleton global registry for convenience; prefer DI in production. */
export const processorRegistry = new ProcessorRegistry();
