// Orchestration registry: central store for saga and workflow definitions.
import type { Saga } from "@veritas/sagas";
import type { WorkflowDefinition } from "@veritas/workflow-engine";
import type { OrchestrationEntry, SagaEntry, WorkflowEntry, LongRunningEntry } from "./types.js";
import {
  OrchestrationNotFoundError,
  OrchestrationAlreadyRegisteredError,
} from "./errors.js";

/** Central registry mapping names to saga, workflow, or long-running entries. */
export class OrchestrationRegistry {
  private readonly _entries = new Map<string, OrchestrationEntry>();

  /** Register a saga definition under its name. */
  registerSaga(saga: Saga<unknown, unknown>): void {
    if (this._entries.has(saga.name)) {
      throw new OrchestrationAlreadyRegisteredError(saga.name);
    }
    const entry: SagaEntry = { kind: "saga", name: saga.name, saga };
    this._entries.set(saga.name, entry);
  }

  /** Register a workflow definition under a given name. */
  registerWorkflow(name: string, definition: WorkflowDefinition): void {
    if (this._entries.has(name)) {
      throw new OrchestrationAlreadyRegisteredError(name);
    }
    const entry: WorkflowEntry = { kind: "workflow", name, definition };
    this._entries.set(name, entry);
  }

  /** Register a long-running workflow that repeats on an interval. */
  registerLongRunning(
    name: string,
    definition: WorkflowDefinition,
    intervalMs: number,
  ): void {
    if (this._entries.has(name)) {
      throw new OrchestrationAlreadyRegisteredError(name);
    }
    const entry: LongRunningEntry = { kind: "long-running", name, definition, intervalMs };
    this._entries.set(name, entry);
  }

  /** Retrieve a registered entry by name; throws if not found. */
  get(name: string): OrchestrationEntry {
    const entry = this._entries.get(name);
    if (entry === undefined) {
      throw new OrchestrationNotFoundError(name);
    }
    return entry;
  }

  /** Check whether an entry is registered under the given name. */
  has(name: string): boolean {
    return this._entries.has(name);
  }

  /** List all registered entry names. */
  listNames(): readonly string[] {
    return Array.from(this._entries.keys());
  }

  /** List all entries of a given kind. */
  listByKind(kind: OrchestrationEntry["kind"]): readonly OrchestrationEntry[] {
    return Array.from(this._entries.values()).filter((e) => e.kind === kind);
  }

  /** Remove a registered entry by name; returns true if it existed. */
  unregister(name: string): boolean {
    return this._entries.delete(name);
  }
}
