// Split compound claims into atomic, individually verifiable claims.
import { newClaimId } from "@veritas/core";
import type { ClaimId } from "@veritas/core";

export interface SplitClaim {
  id: ClaimId;
  text: string;
  sourceIndex: number;
}

const CONJUNCTION_PATTERN =
  /\s*[,;]\s+(?:and|but|while|whereas|however)\s+|\s+(?:and|but|while|whereas|however)\s+/gi;

const MULTI_SENTENCE_PATTERN = /(?<=[.!?])\s+(?=[A-Z])/g;

function isTrivialSplit(part: string): boolean {
  const trimmed = part.trim();
  return trimmed.length < 10 || !/[a-z]/i.test(trimmed);
}

function splitOnConjunctions(text: string): string[] {
  const parts = text.split(CONJUNCTION_PATTERN).map((p) => p.trim()).filter(
    (p) => !isTrivialSplit(p),
  );
  return parts.length > 1 ? parts : [text];
}

function splitOnSentences(text: string): string[] {
  const parts = text.split(MULTI_SENTENCE_PATTERN).map((p) => p.trim()).filter(
    (p) => !isTrivialSplit(p),
  );
  return parts.length > 1 ? parts : [text];
}

function detectCompound(text: string): boolean {
  return (
    CONJUNCTION_PATTERN.test(text) ||
    MULTI_SENTENCE_PATTERN.test(text) ||
    (text.match(/[,;]/g) ?? []).length >= 2
  );
}

/**
 * Split a compound claim text into atomic claims.
 * Returns a single-element array if the input is already atomic.
 */
export function splitClaim(text: string): SplitClaim[] {
  const normalized = text.trim();
  if (!detectCompound(normalized)) {
    return [{ id: newClaimId(), text: normalized, sourceIndex: 0 }];
  }

  let parts: string[] = splitOnSentences(normalized);
  if (parts.length === 1) {
    parts = splitOnConjunctions(normalized);
  }

  if (parts.length <= 1) {
    return [{ id: newClaimId(), text: normalized, sourceIndex: 0 }];
  }

  return parts.map((text, sourceIndex) => ({
    id: newClaimId(),
    text,
    sourceIndex,
  }));
}

/**
 * Split multiple claim texts, returning a flat list of atomic claims.
 */
export function splitClaims(texts: readonly string[]): SplitClaim[] {
  return texts.flatMap((text) => splitClaim(text));
}
