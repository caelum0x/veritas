// LocalStorage — filesystem-backed ObjectStorage for local/dev environments.
import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import { sha256Hex } from "@veritas/core";
import fs from "node:fs/promises";
import path from "node:path";
import type {
  ObjectStorage,
  PutOptions,
  GetOptions,
  ListOptions,
  ListResult,
  DeleteOptions,
} from "./storage.js";
import type { StoredObject } from "./object.js";
import { makeStoredObject } from "./object.js";
import type { StorageError } from "./errors.js";
import {
  notFoundError,
  uploadFailedError,
  downloadFailedError,
  deleteFailedError,
  listFailedError,
  copyFailedError,
  unknownError,
} from "./errors.js";

function metaPath(base: string, key: string): string {
  return path.join(base, ".meta", key + ".json");
}

function dataPath(base: string, key: string): string {
  return path.join(base, key);
}

async function readMeta(base: string, key: string): Promise<StoredObject | undefined> {
  try {
    const raw = await fs.readFile(metaPath(base, key), "utf8");
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      key: parsed["key"] as string,
      size: parsed["size"] as number,
      contentType: parsed["contentType"] as string,
      etag: parsed["etag"] as string,
      lastModified: new Date(parsed["lastModified"] as string),
      metadata: (parsed["metadata"] ?? {}) as Record<string, string>,
      versionId: parsed["versionId"] as string | undefined,
    };
  } catch {
    return undefined;
  }
}

async function writeMeta(base: string, object: StoredObject): Promise<void> {
  const mp = metaPath(base, object.key);
  await fs.mkdir(path.dirname(mp), { recursive: true });
  await fs.writeFile(mp, JSON.stringify({ ...object, lastModified: object.lastModified.toISOString() }), "utf8");
}

export class LocalStorage implements ObjectStorage {
  constructor(private readonly baseDir: string) {}

  async put(
    key: string,
    body: Uint8Array | Buffer | string,
    options: PutOptions = {},
  ): Promise<Result<StoredObject, StorageError>> {
    try {
      const bytes =
        typeof body === "string"
          ? Buffer.from(body, "utf8")
          : Buffer.isBuffer(body)
          ? body
          : Buffer.from(body);

      const dp = dataPath(this.baseDir, key);
      await fs.mkdir(path.dirname(dp), { recursive: true });
      await fs.writeFile(dp, bytes);

      const etag = await sha256Hex(new Uint8Array(bytes));
      const object = makeStoredObject(
        key,
        bytes.byteLength,
        etag,
        options.contentType ?? "application/octet-stream",
        options.metadata ?? {},
        new Date(),
      );
      await writeMeta(this.baseDir, object);
      return ok(object);
    } catch (cause) {
      return err(uploadFailedError(key, cause));
    }
  }

  async get(
    key: string,
    _options: GetOptions = {},
  ): Promise<Result<{ object: StoredObject; body: Uint8Array }, StorageError>> {
    const meta = await readMeta(this.baseDir, key);
    if (meta === undefined) return err(notFoundError(key));
    try {
      const bytes = await fs.readFile(dataPath(this.baseDir, key));
      return ok({ object: meta, body: new Uint8Array(bytes) });
    } catch (cause) {
      return err(downloadFailedError(key, cause));
    }
  }

  async head(
    key: string,
    _options: GetOptions = {},
  ): Promise<Result<StoredObject, StorageError>> {
    const meta = await readMeta(this.baseDir, key);
    if (meta === undefined) return err(notFoundError(key));
    return ok(meta);
  }

  async delete(
    key: string,
    _options: DeleteOptions = {},
  ): Promise<Result<void, StorageError>> {
    try {
      await fs.unlink(dataPath(this.baseDir, key));
      await fs.unlink(metaPath(this.baseDir, key)).catch(() => undefined);
      return ok(undefined);
    } catch (cause: unknown) {
      if ((cause as NodeJS.ErrnoException).code === "ENOENT") return ok(undefined);
      return err(deleteFailedError(key, cause));
    }
  }

  async list(options: ListOptions = {}): Promise<Result<ListResult, StorageError>> {
    try {
      const { prefix = "", maxKeys = 1000 } = options;

      const collected: string[] = [];
      await collectKeys(this.baseDir, this.baseDir, prefix, collected);
      collected.sort();

      const startIdx = options.continuationToken
        ? collected.indexOf(options.continuationToken) + 1
        : 0;

      const sliced = collected.slice(startIdx, startIdx + maxKeys);
      const isTruncated = startIdx + maxKeys < collected.length;

      const objects = await Promise.all(
        sliced.map(async (k) => {
          const meta = await readMeta(this.baseDir, k);
          return meta ?? makeStoredObject(k, 0, "", "application/octet-stream", {}, new Date());
        }),
      );

      return ok({
        objects,
        nextContinuationToken: isTruncated ? collected[startIdx + maxKeys] : undefined,
        isTruncated,
      });
    } catch (cause) {
      return err(listFailedError(options.prefix, cause));
    }
  }

  async exists(key: string): Promise<Result<boolean, StorageError>> {
    try {
      await fs.access(dataPath(this.baseDir, key));
      return ok(true);
    } catch {
      return ok(false);
    }
  }

  async copy(
    sourceKey: string,
    destinationKey: string,
  ): Promise<Result<StoredObject, StorageError>> {
    const meta = await readMeta(this.baseDir, sourceKey);
    if (meta === undefined) {
      return err(copyFailedError(sourceKey, destinationKey, notFoundError(sourceKey)));
    }
    try {
      const dp = dataPath(this.baseDir, destinationKey);
      await fs.mkdir(path.dirname(dp), { recursive: true });
      await fs.copyFile(dataPath(this.baseDir, sourceKey), dp);
      const newMeta = makeStoredObject(
        destinationKey,
        meta.size,
        meta.etag,
        meta.contentType,
        { ...meta.metadata },
        new Date(),
      );
      await writeMeta(this.baseDir, newMeta);
      return ok(newMeta);
    } catch (cause) {
      return err(copyFailedError(sourceKey, destinationKey, cause));
    }
  }
}

async function collectKeys(
  base: string,
  dir: string,
  prefix: string,
  acc: string[],
): Promise<void> {
  let entries: import("node:fs").Dirent<string>[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true, encoding: "utf8" });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.name === ".meta") continue;
    const full = path.join(dir, entry.name);
    const rel = path.relative(base, full);
    if (entry.isDirectory()) {
      await collectKeys(base, full, prefix, acc);
    } else if (rel.startsWith(prefix)) {
      acc.push(rel);
    }
  }
}
