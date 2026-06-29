// KEK/DEK two-tier key hierarchy: manage KEK lifecycle and associate DEKs to records.
import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { KekId } from "./types.js";
import type { KmsProvider } from "./provider.js";
import { KeyHierarchyError } from "./errors.js";

/** Options for initializing or bootstrapping the key hierarchy. */
export interface KeyHierarchyOptions {
  /** Optional pre-existing active KEK id to use instead of generating one. */
  readonly activeKekId?: KekId;
}

/** In-memory registry tracking the active KEK and retired KEKs. */
export class KeyHierarchy {
  private activeKekId: KekId | undefined;
  private readonly retiredKekIds: Set<KekId> = new Set();

  constructor(private readonly kms: KmsProvider) {}

  /** Bootstrap the hierarchy: generate a new KEK if none is active. */
  async initialize(opts: KeyHierarchyOptions = {}): Promise<Result<KekId, KeyHierarchyError>> {
    if (opts.activeKekId) {
      this.activeKekId = opts.activeKekId;
      return ok(opts.activeKekId);
    }
    const result = await this.kms.generateKek();
    if (!result.ok) return result;
    this.activeKekId = result.value;
    return ok(result.value);
  }

  /** Return the currently active KEK id. */
  getActiveKekId(): Result<KekId, KeyHierarchyError> {
    if (!this.activeKekId) {
      return err(new KeyHierarchyError("Key hierarchy not initialized — call initialize() first"));
    }
    return ok(this.activeKekId);
  }

  /** Rotate the active KEK: generate a new one and retire the old one. */
  async rotateKek(): Promise<Result<KekId, KeyHierarchyError>> {
    if (!this.activeKekId) {
      return err(new KeyHierarchyError("Cannot rotate — key hierarchy not initialized"));
    }
    const result = await this.kms.rotateKek(this.activeKekId);
    if (!result.ok) return result;
    this.retiredKekIds.add(this.activeKekId);
    this.activeKekId = result.value;
    return ok(result.value);
  }

  /** Check whether a KEK id is known (active or retired). */
  isKnownKek(kekId: KekId): boolean {
    return this.activeKekId === kekId || this.retiredKekIds.has(kekId);
  }

  /** Check whether a KEK id has been retired (needs re-encryption). */
  isRetiredKek(kekId: KekId): boolean {
    return this.retiredKekIds.has(kekId);
  }

  /** Return all retired KEK ids. */
  getRetiredKekIds(): readonly KekId[] {
    return Array.from(this.retiredKekIds);
  }

  /** Return the underlying KMS provider. */
  getKmsProvider(): KmsProvider {
    return this.kms;
  }
}

/** Factory: create a KeyHierarchy and immediately initialize it. */
export async function createKeyHierarchy(
  kms: KmsProvider,
  opts: KeyHierarchyOptions = {},
): Promise<Result<KeyHierarchy, KeyHierarchyError>> {
  const hierarchy = new KeyHierarchy(kms);
  const initResult = await hierarchy.initialize(opts);
  if (!initResult.ok) return initResult;
  return ok(hierarchy);
}
