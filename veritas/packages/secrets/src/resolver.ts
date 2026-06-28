// Resolves ${secret:name} and ${secret:name@version} template references to their plaintext values.

import { Result, ok, err } from "@veritas/core";
import { SecretsManager } from "./manager.js";
import { makeSecretRef } from "./secret.js";
import { SecretNotFoundError, SecretAccessError } from "./errors.js";

/** Pattern matching ${secret:name} or ${secret:name@version} */
const SECRET_PATTERN = /\$\{secret:([a-zA-Z0-9_/.-]+)(?:@([a-zA-Z0-9_.-]+))?\}/g;

export interface ResolverOptions {
  /** Maximum number of secrets to resolve in a single template (default: 50) */
  readonly maxRefs?: number;
}

export type ResolverError = SecretNotFoundError | SecretAccessError | Error;

/**
 * Extracts all secret references from a template string without resolving them.
 */
export function extractSecretRefs(
  template: string
): ReadonlyArray<{ name: string; version?: string }> {
  const refs: Array<{ name: string; version?: string }> = [];
  const pattern = new RegExp(SECRET_PATTERN.source, "g");
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(template)) !== null) {
    refs.push({ name: match[1]!, version: match[2] });
  }
  return refs;
}

/**
 * Resolves all ${secret:name[@version]} references in a template string.
 * Returns an error if any reference cannot be resolved.
 */
export async function resolveTemplate(
  template: string,
  manager: SecretsManager,
  options: ResolverOptions = {}
): Promise<Result<string, ResolverError>> {
  const maxRefs = options.maxRefs ?? 50;
  const refs = extractSecretRefs(template);

  if (refs.length === 0) {
    return ok(template);
  }

  if (refs.length > maxRefs) {
    return err(new Error(`Template exceeds maximum secret refs: ${refs.length} > ${maxRefs}`));
  }

  // Deduplicate refs by name+version key to minimise fetches
  const uniqueKeys = new Map<string, { name: string; version?: string }>();
  for (const ref of refs) {
    const key = ref.version ? `${ref.name}@${ref.version}` : ref.name;
    uniqueKeys.set(key, ref);
  }

  const resolved = new Map<string, string>();

  for (const [key, { name, version }] of uniqueKeys) {
    const secretRef = makeSecretRef(name, version);
    const result = await manager.getSecret(secretRef);
    if (result.ok) {
      resolved.set(key, result.value.value);
    } else {
      return err(result.error);
    }
  }

  const pattern = new RegExp(SECRET_PATTERN.source, "g");
  const output = template.replace(pattern, (_match, name: string, version?: string) => {
    const key = version ? `${name}@${version}` : name;
    return resolved.get(key) ?? _match;
  });

  return ok(output);
}

/**
 * Resolves a single named secret reference to its value.
 */
export async function resolveSecret(
  name: string,
  version: string | undefined,
  manager: SecretsManager
): Promise<Result<string, ResolverError>> {
  const ref = makeSecretRef(name, version);
  const result = await manager.getSecret(ref);
  if (result.ok) {
    return ok(result.value.value);
  }
  return err(result.error);
}
