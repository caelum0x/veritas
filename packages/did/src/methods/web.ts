// did:web method resolver — resolves DID Documents via HTTPS from a domain host.
import { ok, err, NotFoundError, UnavailableError } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { ParsedDid } from "../did.js";
import { asDid } from "../did.js";
import type { DidDocument } from "../document.js";
import { didDocumentSchema } from "../document.js";
import type { DidMethodResolver, DidResolutionResult, ResolutionOptions } from "../resolver.js";

/** Convert a did:web method-specific-id to the HTTPS URL for the DID document. */
export function didWebToUrl(methodSpecificId: string): string {
  // Decode percent-encoding, replace colons (path separators) with slashes
  const decoded = decodeURIComponent(methodSpecificId);
  const [host, ...pathParts] = decoded.split(":");
  if (!host) throw new Error(`Invalid did:web id: ${methodSpecificId}`);

  const path =
    pathParts.length > 0
      ? `/${pathParts.join("/")}/did.json`
      : "/.well-known/did.json";

  return `https://${host}${path}`;
}

/** Port interface for HTTP fetching — allows mocking in tests. */
export interface HttpFetcher {
  fetch(url: string): Promise<{ ok: boolean; status: number; text(): Promise<string> }>;
}

/** Default HTTP fetcher using the global fetch API (Node 18+). */
const defaultFetcher: HttpFetcher = {
  async fetch(url: string) {
    const res = await globalThis.fetch(url);
    return {
      ok: res.ok,
      status: res.status,
      text: () => res.text(),
    };
  },
};

/** did:web method resolver — fetches DID documents over HTTPS. */
export class WebMethodResolver implements DidMethodResolver {
  readonly method = "web";

  private readonly fetcher: HttpFetcher;

  constructor(fetcher: HttpFetcher = defaultFetcher) {
    this.fetcher = fetcher;
  }

  async resolve(
    parsed: ParsedDid,
    _options: ResolutionOptions,
  ): Promise<Result<DidResolutionResult, NotFoundError | UnavailableError>> {
    const { methodSpecificId } = parsed;

    let url: string;
    try {
      url = didWebToUrl(methodSpecificId);
    } catch (e) {
      return err(
        new UnavailableError({
          message: `Cannot construct URL for did:web: ${e instanceof Error ? e.message : String(e)}`,
        }),
      );
    }

    let rawText: string;
    try {
      const response = await this.fetcher.fetch(url);
      if (!response.ok) {
        if (response.status === 404) {
          return err(new NotFoundError({ message: `DID document not found at ${url}` }));
        }
        return err(
          new UnavailableError({ message: `HTTP ${response.status} fetching DID document from ${url}` }),
        );
      }
      rawText = await response.text();
    } catch (e) {
      return err(
        new UnavailableError({
          message: `Network error fetching did:web document from ${url}: ${e instanceof Error ? e.message : String(e)}`,
        }),
      );
    }

    let parsed_json: unknown;
    try {
      parsed_json = JSON.parse(rawText);
    } catch {
      return err(new UnavailableError({ message: `Invalid JSON in DID document from ${url}` }));
    }

    const validation = didDocumentSchema.safeParse(parsed_json);
    if (!validation.success) {
      return err(
        new UnavailableError({
          message: `DID document from ${url} failed schema validation: ${validation.error.message}`,
        }),
      );
    }

    // Cast validated data to DidDocument
    const raw = validation.data;
    const docId = Array.isArray(raw["@context"])
      ? raw.id
      : raw.id;

    let did: ReturnType<typeof asDid>;
    try {
      did = asDid(docId);
    } catch (e) {
      return err(new UnavailableError({ message: `DID document id is not a valid DID: ${docId}` }));
    }

    // Ensure the resolved id matches the requested did
    const expectedDid = `did:web:${methodSpecificId}`;
    if (did !== expectedDid) {
      return err(
        new UnavailableError({
          message: `DID document id mismatch: expected ${expectedDid}, got ${did}`,
        }),
      );
    }

    const didDocument = parsed_json as DidDocument;

    const result: DidResolutionResult = {
      didDocument,
      didResolutionMetadata: { contentType: "application/did+ld+json" },
      didDocumentMetadata: {},
    };

    return ok(result);
  }
}
