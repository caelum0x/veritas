// Persist reports as storage artifacts — put/get JSON reports keyed by org and report ID.
import { ok, err, type Result } from "@veritas/core";
import type { ObjectStorage } from "./storage.js";
import type { StoredObject } from "./object.js";
import type { StorageError } from "./errors.js";
import { unknownError } from "./errors.js";
import { reportKey } from "./key.js";
import { normalizeBody } from "./stream.js";
import { withCharset } from "./content-type.js";

export interface ReportStoreOptions {
  readonly storage: ObjectStorage;
  readonly prefix?: string;
}

export interface SaveReportOptions {
  readonly orgId: string;
  readonly reportId: string;
  readonly filename?: string;
  readonly metadata?: Record<string, string>;
}

export interface LoadReportOptions {
  readonly orgId: string;
  readonly reportId: string;
  readonly filename?: string;
}

const DEFAULT_FILENAME = "report.json";
const REPORT_CONTENT_TYPE = withCharset("application/json");

export class ReportStore {
  readonly #storage: ObjectStorage;
  readonly #prefix: string | undefined;

  constructor(options: ReportStoreOptions) {
    this.#storage = options.storage;
    this.#prefix = options.prefix;
  }

  #buildKey(orgId: string, reportId: string, filename: string): string {
    const base = reportKey(orgId, reportId, filename);
    return this.#prefix ? `${this.#prefix}/${base}` : base;
  }

  async save(
    report: unknown,
    options: SaveReportOptions,
  ): Promise<Result<StoredObject, StorageError>> {
    const filename = options.filename ?? DEFAULT_FILENAME;
    const key = this.#buildKey(options.orgId, options.reportId, filename);
    const body = normalizeBody(JSON.stringify(report));
    return this.#storage.put(key, body, {
      contentType: REPORT_CONTENT_TYPE,
      metadata: options.metadata,
    });
  }

  async load(options: LoadReportOptions): Promise<Result<unknown, StorageError>> {
    const filename = options.filename ?? DEFAULT_FILENAME;
    const key = this.#buildKey(options.orgId, options.reportId, filename);
    const result = await this.#storage.get(key);
    if (!result.ok) return result;
    try {
      const text = new TextDecoder().decode(result.value.body);
      return ok(JSON.parse(text) as unknown);
    } catch (cause) {
      return err(unknownError("Failed to parse report JSON", cause));
    }
  }

  async exists(options: LoadReportOptions): Promise<Result<boolean, StorageError>> {
    const filename = options.filename ?? DEFAULT_FILENAME;
    const key = this.#buildKey(options.orgId, options.reportId, filename);
    return this.#storage.exists(key);
  }

  async remove(options: LoadReportOptions): Promise<Result<void, StorageError>> {
    const filename = options.filename ?? DEFAULT_FILENAME;
    const key = this.#buildKey(options.orgId, options.reportId, filename);
    return this.#storage.delete(key);
  }
}

export function createReportStore(options: ReportStoreOptions): ReportStore {
  return new ReportStore(options);
}
