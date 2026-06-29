// Extractor registry: maps MIME types to their registered Extractor implementations.

import type { Extractor, ExtractorRegistry } from "./extractor.js";

/** Default in-memory implementation of ExtractorRegistry. */
export class InMemoryExtractorRegistry implements ExtractorRegistry {
  private readonly _map = new Map<string, Extractor>();

  register(extractor: Extractor): void {
    for (const mimeType of extractor.supportedMimeTypes) {
      this._map.set(mimeType, extractor);
    }
  }

  resolve(mimeType: string): Extractor | undefined {
    return (
      this._map.get(mimeType) ??
      this._map.get(normalizeMime(mimeType))
    );
  }

  /** Returns all registered MIME types. */
  registeredMimeTypes(): ReadonlyArray<string> {
    return Array.from(this._map.keys());
  }
}

/** Strip charset/boundary parameters from a MIME type string. */
function normalizeMime(mimeType: string): string {
  return (mimeType.split(";")[0] ?? mimeType).trim().toLowerCase();
}

/** Build a registry pre-populated with the provided extractors. */
export function buildRegistry(extractors: ReadonlyArray<Extractor>): InMemoryExtractorRegistry {
  const registry = new InMemoryExtractorRegistry();
  for (const extractor of extractors) {
    registry.register(extractor);
  }
  return registry;
}
