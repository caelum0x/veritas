// @veritas/storage — public surface re-export for object storage utilities.
export type { ObjectStorage, PutOptions, GetOptions, ListOptions, ListResult, DeleteOptions } from "./storage.js";
export type { StoredObject } from "./object.js";
export { StoredObjectSchema, makeStoredObject } from "./object.js";
export type { KeyBuilderOptions } from "./key.js";
export { buildKey, reportKey, claimKey, artifactKey, parseKeySegments, keyDirectory, keyBasename } from "./key.js";
export type { SignedUrlMethod, SignedUrlOptions, SignedUrl, SignedUrlProvider } from "./signed-url.js";
export { isExpired, makeSignedUrl } from "./signed-url.js";
export { streamToUint8Array, uint8ArrayToStream, stringToStream, streamToString, bufferToUint8Array, normalizeBody } from "./stream.js";
export type { StorageErrorCode } from "./errors.js";
export {
  StorageError,
  notFoundError,
  invalidKeyError,
  uploadFailedError,
  downloadFailedError,
  deleteFailedError,
  listFailedError,
  copyFailedError,
  multipartFailedError,
  unknownError,
  isStorageError,
} from "./errors.js";
export { MemoryStorage } from "./memory-storage.js";
export { LocalStorage } from "./local-storage.js";
export type { MultipartUploadOptions, UploadPart, MultipartUpload, MultipartUploadManager } from "./multipart.js";
export { InMemoryMultipartManager } from "./multipart.js";
export type { LifecycleAction, LifecycleRule, LifecyclePolicy, LifecycleManager } from "./lifecycle.js";
export { InMemoryLifecycleManager, makeLifecycleRule } from "./lifecycle.js";
export {
  DEFAULT_CONTENT_TYPE,
  contentTypeFromExtension,
  contentTypeFromFilename,
  isTextContentType,
  withCharset,
  stripParameters,
} from "./content-type.js";
export type { ReportStoreOptions, SaveReportOptions, LoadReportOptions } from "./report-store.js";
export { ReportStore, createReportStore } from "./report-store.js";
