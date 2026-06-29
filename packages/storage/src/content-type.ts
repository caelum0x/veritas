// MIME helpers — derive and validate content types from filenames and bytes.

const EXTENSION_MAP: Readonly<Record<string, string>> = {
  json: "application/json",
  jsonl: "application/jsonlines",
  txt: "text/plain",
  md: "text/markdown",
  html: "text/html",
  xml: "application/xml",
  csv: "text/csv",
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  zip: "application/zip",
  gz: "application/gzip",
  tar: "application/x-tar",
  bin: "application/octet-stream",
  wasm: "application/wasm",
  mp4: "video/mp4",
  mp3: "audio/mpeg",
  webm: "video/webm",
};

export const DEFAULT_CONTENT_TYPE = "application/octet-stream";

export function contentTypeFromExtension(ext: string): string {
  return EXTENSION_MAP[ext.toLowerCase().replace(/^\./, "")] ?? DEFAULT_CONTENT_TYPE;
}

export function contentTypeFromFilename(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1) return DEFAULT_CONTENT_TYPE;
  return contentTypeFromExtension(filename.slice(lastDot + 1));
}

export function isTextContentType(contentType: string): boolean {
  const base = contentType.split(";")[0]?.trim() ?? "";
  return (
    base.startsWith("text/") ||
    base === "application/json" ||
    base === "application/jsonlines" ||
    base === "application/xml" ||
    base === "image/svg+xml"
  );
}

export function withCharset(contentType: string, charset = "utf-8"): string {
  if (contentType.includes("charset")) return contentType;
  return `${contentType}; charset=${charset}`;
}

export function stripParameters(contentType: string): string {
  return (contentType.split(";")[0] ?? contentType).trim();
}
