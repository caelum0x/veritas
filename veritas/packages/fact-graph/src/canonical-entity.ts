// canonical-entity.ts: normalize and canonicalize entity labels for deduplication.
import { normalizeWhitespace } from "@veritas/core";
import type { EntityNode, EntityType } from "./types.js";
import type { EntityId } from "./types.js";
import { CanonicalizationError } from "./errors.js";
import { ok, err, type Result } from "@veritas/core";

/** A resolved canonical form of an entity label. */
export interface CanonicalForm {
  readonly normalized: string;
  readonly tokens: ReadonlyArray<string>;
  readonly fingerprint: string;
}

/** Options for canonicalization. */
export interface CanonicalizationOptions {
  readonly locale?: string;
  readonly removeStopWords?: boolean;
  readonly entityType?: EntityType;
}

const STOP_WORDS = new Set([
  "the", "a", "an", "of", "in", "on", "at", "to", "and", "or",
  "for", "with", "by", "from", "is", "was", "are", "were",
]);

/** Normalize a raw entity label into a canonical form for matching. */
export function canonicalizeLabel(
  label: string,
  opts: CanonicalizationOptions = {},
): Result<CanonicalForm, CanonicalizationError> {
  if (label.trim().length === 0) {
    return err(new CanonicalizationError(label, "label must not be blank"));
  }

  const normalized = normalizeWhitespace(label).toLowerCase().trim();
  const rawTokens = normalized.split(/\s+/).filter((t) => t.length > 0);

  const tokens =
    opts.removeStopWords === true
      ? rawTokens.filter((t) => !STOP_WORDS.has(t))
      : rawTokens;

  if (tokens.length === 0) {
    return err(new CanonicalizationError(label, "label reduces to empty after tokenization"));
  }

  const fingerprint = buildFingerprint(tokens, opts.entityType);

  return ok({ normalized, tokens, fingerprint });
}

/** Build a stable string fingerprint from tokens (sorted for order-invariance). */
function buildFingerprint(tokens: ReadonlyArray<string>, entityType?: EntityType): string {
  const sorted = [...tokens].sort();
  const prefix = entityType !== undefined ? `${entityType}:` : "";
  return `${prefix}${sorted.join("|")}`;
}

/** Compute a similarity score [0,1] between two canonical forms. */
export function labelSimilarity(a: CanonicalForm, b: CanonicalForm): number {
  if (a.fingerprint === b.fingerprint) return 1;
  const setA = new Set(a.tokens);
  const setB = new Set(b.tokens);
  const intersection = [...setA].filter((t) => setB.has(t)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

/** Return the canonical entity from a group, preferring the highest-confidence one. */
export function selectCanonical(
  entities: ReadonlyArray<EntityNode>,
): Result<EntityNode, CanonicalizationError> {
  if (entities.length === 0) {
    return err(new CanonicalizationError("", "cannot select canonical from empty group"));
  }
  const sorted = [...entities].sort(
    (a, b) => b.provenance.confidence - a.provenance.confidence,
  );
  const best = sorted[0];
  if (best === undefined) {
    return err(new CanonicalizationError("", "sort produced undefined head"));
  }
  return ok(best);
}

/** Group entity nodes by their canonical fingerprint. */
export function groupByFingerprint(
  entities: ReadonlyArray<EntityNode>,
  opts: CanonicalizationOptions = {},
): Map<string, ReadonlyArray<EntityNode>> {
  const groups = new Map<string, EntityNode[]>();

  for (const entity of entities) {
    const result = canonicalizeLabel(entity.label, {
      ...opts,
      entityType: entity.type,
    });
    if (!result.ok) continue;
    const { fingerprint } = result.value;
    const existing = groups.get(fingerprint);
    if (existing !== undefined) {
      existing.push(entity);
    } else {
      groups.set(fingerprint, [entity]);
    }
  }

  return groups as Map<string, ReadonlyArray<EntityNode>>;
}

/** Resolve alias candidates for an entity by normalizing each alias. */
export function resolveAliases(
  entity: EntityNode,
): ReadonlyArray<CanonicalForm> {
  const forms: CanonicalForm[] = [];
  for (const alias of [entity.label, ...entity.aliases]) {
    const result = canonicalizeLabel(alias, { entityType: entity.type });
    if (result.ok) forms.push(result.value);
  }
  return forms;
}

/** Check if two entities should be considered the same by alias overlap. */
export function areAliasEquivalent(a: EntityNode, b: EntityNode): boolean {
  if (a.type !== b.type) return false;
  const aForms = resolveAliases(a).map((f) => f.fingerprint);
  const bForms = new Set(resolveAliases(b).map((f) => f.fingerprint));
  return aForms.some((fp) => bForms.has(fp));
}

/** Produce a merged alias list from two entities, deduplicating by fingerprint. */
export function mergeAliases(
  a: EntityNode,
  b: EntityNode,
): ReadonlyArray<string> {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const label of [...a.aliases, a.label, ...b.aliases, b.label]) {
    const canon = canonicalizeLabel(label);
    if (!canon.ok) continue;
    if (!seen.has(canon.value.fingerprint)) {
      seen.add(canon.value.fingerprint);
      result.push(label);
    }
  }
  return result;
}

/** Build a lookup map from EntityId to canonical EntityId using canonicalization. */
export function buildCanonicalMap(
  entities: ReadonlyArray<EntityNode>,
  opts: CanonicalizationOptions = {},
): Map<EntityId, EntityId> {
  const mapping = new Map<EntityId, EntityId>();
  const groups = groupByFingerprint(entities, opts);

  for (const group of groups.values()) {
    const canonResult = selectCanonical(group);
    if (!canonResult.ok) continue;
    const canonical = canonResult.value;
    for (const entity of group) {
      mapping.set(entity.id, canonical.id);
    }
  }

  return mapping;
}
