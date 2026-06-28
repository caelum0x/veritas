// linker.ts: entity linking — resolve extracted mentions to canonical entity ids.

import type { Entity } from "./entity.js";
import type { EntityType } from "./types.js";
import { buildAliasIndex, resolveEntityId } from "./merge.js";

/** Result of linking a single mention to a canonical entity. */
export interface LinkResult {
  readonly mentionText: string;
  readonly entityType: EntityType;
  readonly resolvedId: string | null;
  readonly confidence: number;
}

/** Port interface for entity linkers. */
export interface LinkerPort {
  link(mentions: ReadonlyArray<{ text: string; type: EntityType }>): ReadonlyArray<LinkResult>;
}

/** Configuration for the built-in linker. */
export interface LinkerConfig {
  readonly similarityThreshold: number;
}

const DEFAULT_CONFIG: LinkerConfig = { similarityThreshold: 0.85 };

/** Normalised edit-distance similarity in [0,1]. */
function similarity(a: string, b: string): number {
  const s = a.toLowerCase().trim();
  const t = b.toLowerCase().trim();
  if (s === t) return 1;
  const m = s.length;
  const n = t.length;
  if (m === 0 || n === 0) return 0;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i]![j] =
        s[i - 1] === t[j - 1]
          ? dp[i - 1]![j - 1]!
          : 1 + Math.min(dp[i - 1]![j]!, dp[i]![j - 1]!, dp[i - 1]![j - 1]!);
    }
  }
  return 1 - dp[m]![n]! / Math.max(m, n);
}

/** Link a single mention against the entity knowledge base. */
function linkMention(
  mentionText: string,
  entityType: EntityType,
  entities: ReadonlyArray<Entity>,
  aliasIndex: ReadonlyMap<string, string>,
  config: LinkerConfig,
): LinkResult {
  // 1. Exact alias lookup
  const exactId = resolveEntityId(mentionText, aliasIndex);
  if (exactId !== mentionText) {
    return { mentionText, entityType, resolvedId: exactId, confidence: 1.0 };
  }

  // 2. Fuzzy match against labels of same type
  const sameType = entities.filter((e) => e.type === entityType);
  let bestId: string | null = null;
  let bestScore = 0;
  for (const entity of sameType) {
    const score = similarity(mentionText, entity.label);
    if (score > bestScore) {
      bestScore = score;
      bestId = entity.id;
    }
    for (const alias of entity.aliases) {
      const aliasScore = similarity(mentionText, alias);
      if (aliasScore > bestScore) {
        bestScore = aliasScore;
        bestId = entity.id;
      }
    }
  }

  if (bestScore >= config.similarityThreshold && bestId !== null) {
    return { mentionText, entityType, resolvedId: bestId, confidence: bestScore };
  }

  return { mentionText, entityType, resolvedId: null, confidence: 0 };
}

/** Create a linker backed by a static entity knowledge base. */
export function linkEntities(
  mentions: ReadonlyArray<{ text: string; type: EntityType }>,
  entities: ReadonlyArray<Entity>,
  config: LinkerConfig = DEFAULT_CONFIG,
): ReadonlyArray<LinkResult> {
  const aliasIndex = buildAliasIndex(entities);
  return Object.freeze(
    mentions.map((m) => linkMention(m.text, m.type, entities, aliasIndex, config)),
  );
}

/** Mock linker that always returns null (no links). Useful in tests. */
export const mockLinker: LinkerPort = {
  link(mentions) {
    return Object.freeze(
      mentions.map((m) => ({
        mentionText: m.text,
        entityType: m.type,
        resolvedId: null,
        confidence: 0,
      })),
    );
  },
};

/** Build a stateful linker from a knowledge base of entities. */
export function makeEntityLinker(
  entities: ReadonlyArray<Entity>,
  config: LinkerConfig = DEFAULT_CONFIG,
): LinkerPort & { updateKnowledgeBase(e: ReadonlyArray<Entity>): LinkerPort } {
  return {
    link(mentions) {
      return linkEntities(mentions, entities, config);
    },
    updateKnowledgeBase(newEntities) {
      return makeEntityLinker(newEntities, config);
    },
  };
}
