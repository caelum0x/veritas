// Tracks secret version history with immutable version records.
import { z } from "zod";
import { ok, err, Result } from "@veritas/core";
import { SecretNotFoundError } from "./errors.js";

export const SecretVersionRecordSchema = z.object({
  secretName: z.string().min(1),
  version: z.string().min(1),
  createdAt: z.string().datetime(),
  createdBy: z.string().optional(),
  comment: z.string().optional(),
  deprecated: z.boolean().default(false),
  deprecatedAt: z.string().datetime().optional(),
});

export type SecretVersionRecord = z.infer<typeof SecretVersionRecordSchema>;

export interface VersionHistoryOptions {
  readonly includeDeprecated?: boolean;
  readonly limit?: number;
}

export class SecretVersionRegistry {
  private readonly history = new Map<string, SecretVersionRecord[]>();

  record(entry: SecretVersionRecord): void {
    const parsed = SecretVersionRecordSchema.parse(entry);
    const existing = this.history.get(parsed.secretName) ?? [];
    this.history.set(parsed.secretName, [...existing, parsed]);
  }

  getHistory(
    secretName: string,
    options?: VersionHistoryOptions
  ): Result<ReadonlyArray<SecretVersionRecord>, SecretNotFoundError> {
    const entries = this.history.get(secretName);
    if (!entries) {
      return err(new SecretNotFoundError(secretName));
    }
    let result = options?.includeDeprecated
      ? entries
      : entries.filter((e) => !e.deprecated);
    if (options?.limit !== undefined) {
      result = result.slice(-options.limit);
    }
    return ok(result);
  }

  deprecateVersion(
    secretName: string,
    version: string
  ): Result<void, SecretNotFoundError> {
    const entries = this.history.get(secretName);
    if (!entries) {
      return err(new SecretNotFoundError(secretName, version));
    }
    const idx = entries.findIndex((e) => e.version === version);
    if (idx === -1) {
      return err(new SecretNotFoundError(secretName, version));
    }
    const now = new Date().toISOString();
    const updated = entries.map((e, i) =>
      i === idx ? { ...e, deprecated: true, deprecatedAt: now } : e
    );
    this.history.set(secretName, updated);
    return ok(undefined);
  }

  latestVersion(
    secretName: string
  ): Result<SecretVersionRecord, SecretNotFoundError> {
    const entries = this.history.get(secretName);
    const active = entries?.filter((e) => !e.deprecated);
    if (!active || active.length === 0) {
      return err(new SecretNotFoundError(secretName));
    }
    return ok(active[active.length - 1]!);
  }

  pruneOldVersions(
    secretName: string,
    keepLatest: number
  ): Result<number, SecretNotFoundError> {
    const entries = this.history.get(secretName);
    if (!entries) {
      return err(new SecretNotFoundError(secretName));
    }
    const keep = entries.slice(-keepLatest);
    const pruned = entries.length - keep.length;
    this.history.set(secretName, keep);
    return ok(pruned);
  }

  listSecretNames(): ReadonlyArray<string> {
    return [...this.history.keys()];
  }
}
