// Guardrail registry: register and retrieve guardrails by phase and id.
import type { Guardrail, GuardrailPhase } from "./types.js";
import { GuardrailConfigError } from "./errors.js";

export class GuardrailRegistry {
  private readonly _guardrails = new Map<string, Guardrail>();

  /** Register a guardrail; throws GuardrailConfigError if id is already registered. */
  register(guardrail: Guardrail): this {
    if (this._guardrails.has(guardrail.id)) {
      throw new GuardrailConfigError(`Guardrail already registered: ${guardrail.id}`);
    }
    this._guardrails.set(guardrail.id, guardrail);
    return this;
  }

  /** Replace an existing registration; throws if the guardrail is not already registered. */
  replace(guardrail: Guardrail): this {
    if (!this._guardrails.has(guardrail.id)) {
      throw new GuardrailConfigError(`Guardrail not found for replacement: ${guardrail.id}`);
    }
    this._guardrails.set(guardrail.id, guardrail);
    return this;
  }

  /** Unregister a guardrail by id; no-op if not found. */
  unregister(id: string): this {
    this._guardrails.delete(id);
    return this;
  }

  /** Return all guardrails for a given phase in registration order. */
  forPhase(phase: GuardrailPhase): readonly Guardrail[] {
    return [...this._guardrails.values()].filter((g) => g.phase === phase);
  }

  /** Retrieve a guardrail by id, or undefined if not registered. */
  get(id: string): Guardrail | undefined {
    return this._guardrails.get(id);
  }

  /** Return all registered guardrails in registration order. */
  all(): readonly Guardrail[] {
    return [...this._guardrails.values()];
  }

  /** Return true if a guardrail with the given id is registered. */
  has(id: string): boolean {
    return this._guardrails.has(id);
  }
}
