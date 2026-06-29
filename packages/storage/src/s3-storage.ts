// S3Storage — S3-compatible ObjectStorage adapter using fetch-based signed requests.
import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
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

export interface S3Config {
  readonly endpoint: string;
  readonly bucket: string;
  readonly region: string;
  readonly accessKeyId: string;
  readonly secretAccessKey: string;
  readonly forcePathStyle?: boolean;
}

function objectUrl(config: S3Config, key: string): string {
  const encoded = key.split("/").map(encodeURIComponent).join("/");
  if (config.forcePathStyle) {
    return `${config.endpoint}/${config.bucket}/${encoded}`;
  }
  const url = new URL(config.endpoint);
  return `${url.protocol}//${config.bucket}.${url.host}/${encoded}`;
}

function bucketUrl(config: S3Config): string {
  if (config.forcePathStyle) {
    return `${config.endpoint}/${config.bucket}`;
  }
  const url = new URL(config.endpoint);
  return `${url.protocol}//${config.bucket}.${url.host}`;
}

async function hmacSha256(key: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await globalThis.crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return globalThis.crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data));
}

async function sha256Hex(data: string | Uint8Array): Promise<string> {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  const hash = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function signRequest(
  config: S3Config,
  method: string,
  url: string,
  headers: Record<string, string>,
  body: Uint8Array | undefined,
): Promise<Record<string, string>> {
  const now = new Date();
  const datestamp = now.toISOString().slice(0, 10).replace(/-/g, "");
  const amzdate = now.toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";

  const payloadHash = await sha256Hex(body ?? new Uint8Array(0));
  const parsedUrl = new URL(url);
  const canonicalUri = parsedUrl.pathname;
  const canonicalQueryString = parsedUrl.searchParams.toString();

  const allHeaders: Record<string, string> = {
    ...headers,
    host: parsedUrl.host,
    "x-amz-date": amzdate,
    "x-amz-content-sha256": payloadHash,
  };

  const signedHeaderNames = Object.keys(allHeaders).sort();
  const canonicalHeaders =
    signedHeaderNames.map((k) => `${k.toLowerCase()}:${allHeaders[k]!.trim()}`).join("\n") + "\n";
  const signedHeaders = signedHeaderNames.map((k) => k.toLowerCase()).join(";");

  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const credentialScope = `${datestamp}/${config.region}/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzdate,
    credentialScope,
    await sha256Hex(canonicalRequest),
  ].join("\n");

  const encoder = new TextEncoder();
  const kDate = await hmacSha256(encoder.encode("AWS4" + config.secretAccessKey), datestamp);
  const kRegion = await hmacSha256(kDate, config.region);
  const kService = await hmacSha256(kRegion, "s3");
  const kSigning = await hmacSha256(kService, "aws4_request");
  const signature = bufToHex(await hmacSha256(kSigning, stringToSign));

  const authorization =
    `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    ...allHeaders,
    Authorization: authorization,
  };
}

function parseXmlValue(xml: string, tag: string): string | undefined {
  const m = xml.match(new RegExp(`<${tag}>([^<]*)</${tag}>`));
  return m?.[1];
}

function parseXmlList(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}>([^<]*)</${tag}>`, "g");
  const results: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    if (m[1] !== undefined) results.push(m[1]);
  }
  return results;
}

export class S3Storage implements ObjectStorage {
  constructor(private readonly config: S3Config) {}

  async put(
    key: string,
    body: Uint8Array | Buffer | string,
    options: PutOptions = {},
  ): Promise<Result<StoredObject, StorageError>> {
    try {
      const bytes =
        typeof body === "string"
          ? new TextEncoder().encode(body)
          : body instanceof Buffer
          ? new Uint8Array(body)
          : body;

      const url = objectUrl(this.config, key);
      const contentType = options.contentType ?? "application/octet-stream";
      const rawHeaders: Record<string, string> = { "content-type": contentType };
      if (options.metadata) {
        for (const [k, v] of Object.entries(options.metadata)) {
          rawHeaders[`x-amz-meta-${k.toLowerCase()}`] = v;
        }
      }

      const signed = await signRequest(this.config, "PUT", url, rawHeaders, bytes);
      const res = await fetch(url, { method: "PUT", headers: signed, body: bytes });

      if (!res.ok) {
        return err(uploadFailedError(key, new Error(`HTTP ${res.status}`)));
      }

      const etag = (res.headers.get("etag") ?? "").replace(/"/g, "");
      const object = makeStoredObject(key, bytes.byteLength, etag, contentType, options.metadata ?? {}, new Date());
      return ok(object);
    } catch (cause) {
      return err(uploadFailedError(key, cause));
    }
  }

  async get(
    key: string,
    _options: GetOptions = {},
  ): Promise<Result<{ object: StoredObject; body: Uint8Array }, StorageError>> {
    try {
      const url = objectUrl(this.config, key);
      const signed = await signRequest(this.config, "GET", url, {}, undefined);
      const res = await fetch(url, { method: "GET", headers: signed });

      if (res.status === 404) return err(notFoundError(key));
      if (!res.ok) return err(downloadFailedError(key, new Error(`HTTP ${res.status}`)));

      const buf = await res.arrayBuffer();
      const bytes = new Uint8Array(buf);
      const etag = (res.headers.get("etag") ?? "").replace(/"/g, "");
      const contentType = res.headers.get("content-type") ?? "application/octet-stream";
      const object = makeStoredObject(key, bytes.byteLength, etag, contentType, {}, new Date());
      return ok({ object, body: bytes });
    } catch (cause) {
      return err(downloadFailedError(key, cause));
    }
  }

  async head(
    key: string,
    _options: GetOptions = {},
  ): Promise<Result<StoredObject, StorageError>> {
    try {
      const url = objectUrl(this.config, key);
      const signed = await signRequest(this.config, "HEAD", url, {}, undefined);
      const res = await fetch(url, { method: "HEAD", headers: signed });

      if (res.status === 404) return err(notFoundError(key));
      if (!res.ok) return err(unknownError(`HEAD failed for "${key}": HTTP ${res.status}`));

      const etag = (res.headers.get("etag") ?? "").replace(/"/g, "");
      const contentType = res.headers.get("content-type") ?? "application/octet-stream";
      const size = parseInt(res.headers.get("content-length") ?? "0", 10);
      const object = makeStoredObject(key, size, etag, contentType, {}, new Date());
      return ok(object);
    } catch (cause) {
      return err(unknownError(`HEAD failed for "${key}"`, cause));
    }
  }

  async delete(
    key: string,
    _options: DeleteOptions = {},
  ): Promise<Result<void, StorageError>> {
    try {
      const url = objectUrl(this.config, key);
      const signed = await signRequest(this.config, "DELETE", url, {}, undefined);
      const res = await fetch(url, { method: "DELETE", headers: signed });

      if (!res.ok && res.status !== 404) {
        return err(deleteFailedError(key, new Error(`HTTP ${res.status}`)));
      }
      return ok(undefined);
    } catch (cause) {
      return err(deleteFailedError(key, cause));
    }
  }

  async list(options: ListOptions = {}): Promise<Result<ListResult, StorageError>> {
    try {
      const params = new URLSearchParams({ "list-type": "2" });
      if (options.prefix) params.set("prefix", options.prefix);
      if (options.maxKeys !== undefined) params.set("max-keys", String(options.maxKeys));
      if (options.continuationToken) params.set("continuation-token", options.continuationToken);

      const base = bucketUrl(this.config);
      const url = `${base}?${params.toString()}`;
      const signed = await signRequest(this.config, "GET", url, {}, undefined);
      const res = await fetch(url, { method: "GET", headers: signed });

      if (!res.ok) return err(listFailedError(options.prefix, new Error(`HTTP ${res.status}`)));

      const xml = await res.text();
      const keys = parseXmlList(xml, "Key");
      const sizes = parseXmlList(xml, "Size");
      const etags = parseXmlList(xml, "ETag");
      const isTruncated = parseXmlValue(xml, "IsTruncated") === "true";
      const nextToken = parseXmlValue(xml, "NextContinuationToken");

      const objects: StoredObject[] = keys.map((k, i) =>
        makeStoredObject(
          k,
          parseInt(sizes[i] ?? "0", 10),
          (etags[i] ?? "").replace(/"/g, ""),
          "application/octet-stream",
          {},
          new Date(),
        ),
      );

      return ok({ objects, nextContinuationToken: nextToken, isTruncated });
    } catch (cause) {
      return err(listFailedError(options.prefix, cause));
    }
  }

  async exists(key: string): Promise<Result<boolean, StorageError>> {
    const result = await this.head(key);
    if (result.ok) return ok(true);
    if (result.error.code === "NOT_FOUND") return ok(false);
    return err(result.error);
  }

  async copy(
    sourceKey: string,
    destinationKey: string,
  ): Promise<Result<StoredObject, StorageError>> {
    try {
      const url = objectUrl(this.config, destinationKey);
      const copySource = `/${this.config.bucket}/${sourceKey}`;
      const headers = { "x-amz-copy-source": copySource };
      const signed = await signRequest(this.config, "PUT", url, headers, undefined);
      const res = await fetch(url, { method: "PUT", headers: signed });

      if (!res.ok) {
        return err(copyFailedError(sourceKey, destinationKey, new Error(`HTTP ${res.status}`)));
      }

      const headResult = await this.head(destinationKey);
      if (!headResult.ok) {
        return err(copyFailedError(sourceKey, destinationKey, headResult.error));
      }
      return ok(headResult.value);
    } catch (cause) {
      return err(copyFailedError(sourceKey, destinationKey, cause));
    }
  }
}
