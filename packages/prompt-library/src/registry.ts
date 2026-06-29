// Prompt registry — stores, retrieves, and versions PromptTemplate entries by id.
import { type Result, ok, err } from "@veritas/core";
import { type PromptTemplate } from "./prompt.js";
import { type VersionedEntry, sortByVersion, latestEntry, compareVersions } from "./version.js";

export interface RegistryEntry {
  readonly id: string;
  readonly versions: VersionedEntry[];
}

export interface RegisterOptions {
  readonly changelog?: string;
  readonly publishedAt?: string;
}

/** In-memory prompt registry — singleton per process. */
const _store: Map<string, VersionedEntry[]> = new Map();

function now(): string {
  return new Date().toISOString();
}

/**
 * Register a prompt template version.
 * Rejects if the same id+version has already been registered.
 */
export function registerPrompt(
  template: PromptTemplate,
  opts: RegisterOptions = {}
): Result<void> {
  const { id, version } = template.meta;
  const existing = _store.get(id) ?? [];

  const duplicate = existing.find((e) => e.version === version);
  if (duplicate !== undefined) {
    return err(new Error(`Prompt "${id}" version "${version}" is already registered.`));
  }

  const entry: VersionedEntry = {
    version,
    template,
    changelog: opts.changelog ?? "",
    publishedAt: opts.publishedAt ?? now(),
  };

  _store.set(id, [...existing, entry]);
  return ok(undefined);
}

/** Retrieve the latest version of a prompt by id. */
export function getPrompt(id: string): Result<PromptTemplate> {
  const entries = _store.get(id);
  if (entries === undefined || entries.length === 0) {
    return err(new Error(`Prompt "${id}" not found.`));
  }
  const latest = latestEntry(entries);
  if (latest === undefined) {
    return err(new Error(`Prompt "${id}" has no versions.`));
  }
  return ok(latest.template);
}

/** Retrieve a specific version of a prompt. */
export function getPromptVersion(id: string, version: string): Result<PromptTemplate> {
  const entries = _store.get(id);
  if (entries === undefined || entries.length === 0) {
    return err(new Error(`Prompt "${id}" not found.`));
  }
  const entry = entries.find((e) => e.version === version);
  if (entry === undefined) {
    return err(new Error(`Prompt "${id}" version "${version}" not found.`));
  }
  return ok(entry.template);
}

/** List all versions for a prompt id, newest first. */
export function listVersions(id: string): Result<VersionedEntry[]> {
  const entries = _store.get(id);
  if (entries === undefined) {
    return err(new Error(`Prompt "${id}" not found.`));
  }
  return ok(sortByVersion(entries));
}

/** List all registered prompt ids. */
export function listPromptIds(): string[] {
  return [..._store.keys()].sort();
}

/** List all prompts with their latest version metadata. */
export function listPrompts(): RegistryEntry[] {
  return listPromptIds().map((id) => ({
    id,
    versions: sortByVersion(_store.get(id) ?? []),
  }));
}

/** Remove a prompt and all its versions (e.g. for testing). */
export function deregisterPrompt(id: string): Result<void> {
  if (!_store.has(id)) {
    return err(new Error(`Prompt "${id}" not found.`));
  }
  _store.delete(id);
  return ok(undefined);
}

/** Clear the entire registry (useful in tests). */
export function clearRegistry(): void {
  _store.clear();
}

/** Returns true when the registry contains at least one version of the given id. */
export function hasPrompt(id: string): boolean {
  const entries = _store.get(id);
  return entries !== undefined && entries.length > 0;
}

/**
 * Upgrade a registered prompt to a new version — convenience wrapper around
 * registerPrompt that validates version ordering.
 */
export function upgradePrompt(
  template: PromptTemplate,
  opts: RegisterOptions = {}
): Result<void> {
  const { id, version } = template.meta;
  const entries = _store.get(id);

  if (entries !== undefined && entries.length > 0) {
    const latest = latestEntry(entries);
    if (latest !== undefined && compareVersions(version, latest.version) <= 0) {
      return err(
        new Error(
          `Upgrade version "${version}" must be greater than current "${latest.version}" for prompt "${id}".`
        )
      );
    }
  }

  return registerPrompt(template, opts);
}
