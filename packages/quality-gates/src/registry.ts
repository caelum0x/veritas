// GateRegistry: named store for QualityGate instances, supporting lookup and listing.

import type { QualityGate } from "./gate.js";
import type { GateMeta } from "./types.js";
import { GateNotFoundError, DuplicateGateError } from "./errors.js";

/** Registry of quality gates, keyed by stable gate id. */
export class GateRegistry {
  readonly #gates: Map<string, QualityGate> = new Map();

  /** Register a gate. Throws DuplicateGateError if the id is already taken. */
  register(gate: QualityGate): void {
    if (this.#gates.has(gate.id)) {
      throw new DuplicateGateError(gate.id);
    }
    this.#gates.set(gate.id, gate);
  }

  /**
   * Register a gate, silently replacing any existing gate with the same id.
   * Prefer `register` unless intentionally overriding a default gate.
   */
  override(gate: QualityGate): void {
    this.#gates.set(gate.id, gate);
  }

  /** Look up a gate by id. Throws GateNotFoundError when absent. */
  get(id: string): QualityGate {
    const gate = this.#gates.get(id);
    if (gate === undefined) throw new GateNotFoundError(id);
    return gate;
  }

  /** Returns true when a gate with the given id is registered. */
  has(id: string): boolean {
    return this.#gates.has(id);
  }

  /** Remove a gate by id. Returns true when the gate was present. */
  remove(id: string): boolean {
    return this.#gates.delete(id);
  }

  /** All registered gates in insertion order. */
  all(): readonly QualityGate[] {
    return [...this.#gates.values()];
  }

  /** Meta descriptors for all registered gates (id, name, failOn). */
  meta(): readonly GateMeta[] {
    return this.all().map((g) => ({
      id: g.id,
      name: g.name,
      description: "",
      defaultFailOn: g.failOn,
    }));
  }

  /** Number of registered gates. */
  get size(): number {
    return this.#gates.size;
  }
}

/** Singleton default registry, populated by gate modules on import. */
export const defaultRegistry = new GateRegistry();
