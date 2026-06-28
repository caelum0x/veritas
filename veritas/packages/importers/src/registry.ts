// Importer registry: maps ImporterKind -> Importer instances and manages source entries.

import { ok, err, newId } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { Importer } from "./importer.js";
import type { ImporterEntry, ImporterKind, RegisterSourceParams } from "./types.js";
import { UnknownImporterError, DuplicateSourceError } from "./errors.js";

/** In-memory registry that stores importer factories and source feed entries. */
export class ImporterRegistry {
  readonly #importers = new Map<ImporterKind, Importer>();
  readonly #entries = new Map<string, ImporterEntry>();

  /** Register a concrete Importer implementation for a given kind. */
  register(kind: ImporterKind, importer: Importer): void {
    this.#importers.set(kind, importer);
  }

  /** Resolve an Importer by kind; returns Err if not registered. */
  resolve(kind: ImporterKind): Result<Importer> {
    const importer = this.#importers.get(kind);
    if (!importer) {
      return err(new UnknownImporterError(kind));
    }
    return ok(importer);
  }

  /** Add a source feed entry; returns Err if the URL is already registered. */
  addSource(params: RegisterSourceParams): Result<ImporterEntry> {
    const existing = [...this.#entries.values()].find(
      (e) => e.sourceUrl === params.sourceUrl,
    );
    if (existing) {
      return err(new DuplicateSourceError(params.sourceUrl));
    }

    const now = new Date().toISOString();
    const entry: ImporterEntry = {
      id: newId("entry"),
      kind: params.kind,
      sourceUrl: params.sourceUrl,
      config: params.config,
      enabled: true,
      createdAt: now,
      updatedAt: now,
    };

    this.#entries.set(entry.id, entry);
    return ok(entry);
  }

  /** Toggle the enabled state of a source entry. */
  setEnabled(id: string, enabled: boolean): Result<ImporterEntry> {
    const entry = this.#entries.get(id);
    if (!entry) {
      return err(new UnknownImporterError(id));
    }

    const updated: ImporterEntry = {
      ...entry,
      enabled,
      updatedAt: new Date().toISOString(),
    };
    this.#entries.set(id, updated);
    return ok(updated);
  }

  /** Return all registered source entries, optionally filtered to enabled only. */
  listSources(onlyEnabled = false): readonly ImporterEntry[] {
    const all = [...this.#entries.values()];
    return onlyEnabled ? all.filter((e) => e.enabled) : all;
  }

  /** Return the source entry for a given id, or undefined. */
  getSource(id: string): ImporterEntry | undefined {
    return this.#entries.get(id);
  }

  /** Remove a source entry by id; returns true if it existed. */
  removeSource(id: string): boolean {
    return this.#entries.delete(id);
  }

  /** All registered importer kinds. */
  registeredKinds(): ImporterKind[] {
    return [...this.#importers.keys()];
  }
}
