// Build a canonical string representation of an HTTP request for signing.

/** Normalise a header name to lowercase. */
function normaliseHeaderName(name: string): string {
  return name.toLowerCase().trim();
}

/** Normalise a header value by collapsing internal whitespace. */
function normaliseHeaderValue(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export interface CanonicalRequestInput {
  readonly method: string;
  readonly path: string;
  readonly query: Record<string, string>;
  /** Only the headers that should be signed (key → value). */
  readonly headers: Record<string, string>;
  /** SHA-256 hex digest of the request body, or empty-string hash for no body. */
  readonly bodyHash: string;
}

/** Sorted, percent-encoded query string from a flat record. */
export function canonicalizeQuery(query: Record<string, string>): string {
  return Object.keys(query)
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(query[k] ?? "")}`)
    .join("&");
}

/** Build a sorted, normalised "name:value\n" canonical headers string. */
export function canonicalizeHeaders(headers: Record<string, string>): string {
  const sorted = Object.keys(headers)
    .map((k) => normaliseHeaderName(k))
    .sort();

  const norm: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    norm[normaliseHeaderName(k)] = normaliseHeaderValue(v);
  }

  return sorted.map((h) => `${h}:${norm[h] ?? ""}`).join("\n");
}

/**
 * Produce a canonical request string.
 *
 * Format (newline-delimited):
 *   METHOD
 *   /url/path
 *   query=string
 *   header-name:value\n...
 *   signed-header-list
 *   body-hash
 */
export function buildCanonicalRequest(input: CanonicalRequestInput): string {
  const method = input.method.toUpperCase();
  const path = input.path.startsWith("/") ? input.path : `/${input.path}`;
  const queryString = canonicalizeQuery(input.query);
  const canonHeaders = canonicalizeHeaders(input.headers);

  const signedHeadersList = Object.keys(input.headers)
    .map((h) => h.toLowerCase().trim())
    .sort()
    .join(";");

  return [method, path, queryString, canonHeaders, signedHeadersList, input.bodyHash].join("\n");
}

/** Extract the list of signed header names from a canonical request string. */
export function extractSignedHeaders(canonicalRequest: string): string[] {
  const lines = canonicalRequest.split("\n");
  const signedList = lines[lines.length - 2] ?? "";
  return signedList ? signedList.split(";") : [];
}
