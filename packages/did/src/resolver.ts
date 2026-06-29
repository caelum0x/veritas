// DID Resolver port interface and in-memory method registry.
import type { Result } from "@veritas/core";
import { err } from "@veritas/core";
import { NotFoundError, UnavailableError } from "@veritas/core";
import type { Did, ParsedDid } from "./did.js";
import { parseDid } from "./did.js";
import type { DidDocument } from "./document.js";
import type { ResolutionMetadata, DocumentMetadata } from "./types.js";

/** Resolution options passed to resolver implementations. */
export interface ResolutionOptions {
  readonly accept?: string;
  readonly noCache?: boolean;
}

/** Full DID resolution result per W3C DID Resolution spec. */
export interface DidResolutionResult {
  readonly didDocument: DidDocument | null;
  readonly didResolutionMetadata: ResolutionMetadata;
  readonly didDocumentMetadata: DocumentMetadata;
}

/** Port interface for a DID method resolver. */
export interface DidMethodResolver {
  readonly method: string;
  resolve(
    parsed: ParsedDid,
    options: ResolutionOptions,
  ): Promise<Result<DidResolutionResult, NotFoundError | UnavailableError>>;
}

/** Universal DID resolver that dispatches to registered method resolvers. */
export class DidResolver {
  private readonly resolvers = new Map<string, DidMethodResolver>();

  /** Register a resolver for a specific DID method. */
  register(resolver: DidMethodResolver): void {
    this.resolvers.set(resolver.method, resolver);
  }

  /** Resolve a DID string to its DID Document. */
  async resolve(
    did: string,
    options: ResolutionOptions = {},
  ): Promise<Result<DidResolutionResult, NotFoundError | UnavailableError>> {
    const parseResult = parseDid(did);
    if (!parseResult.ok) {
      return err(
        new UnavailableError({ message: `DID parse error: ${parseResult.error.message}` }),
      );
    }

    const parsed = parseResult.value;
    const resolver = this.resolvers.get(parsed.method);
    if (!resolver) {
      return err(
        new UnavailableError({ message: `No resolver registered for DID method: ${parsed.method}` }),
      );
    }

    return resolver.resolve(parsed, options);
  }

  /** Resolve and return only the DID Document (unwrapped convenience method). */
  async resolveDocument(
    did: string,
    options: ResolutionOptions = {},
  ): Promise<Result<DidDocument, NotFoundError | UnavailableError>> {
    const result = await this.resolve(did, options);
    if (!result.ok) return result;
    const { didDocument } = result.value;
    if (!didDocument) {
      return err(new NotFoundError({ message: `DID document not found for: ${did}` }));
    }
    return { ok: true, value: didDocument };
  }

  /** List all registered DID methods. */
  registeredMethods(): readonly string[] {
    return [...this.resolvers.keys()];
  }
}

/** Singleton default resolver instance. */
export const defaultResolver = new DidResolver();
