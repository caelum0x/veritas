// contradiction-link.ts: bridge between the fact-graph and external contradiction detection.

import { newId } from "@veritas/core";
import type { Triple } from "./triple.js";
import type { Entity } from "./entity.js";

/** Severity of a detected contradiction. */
export type ContradictionSeverity = "low" | "medium" | "high" | "critical";

/** A link representing a detected contradiction between two entity/triple pairs. */
export interface ContradictionLink {
  readonly id: string;
  readonly subjectTripleId: string;
  readonly objectTripleId: string;
  readonly subjectEntityId: string;
  readonly objectEntityId: string;
  readonly severity: ContradictionSeverity;
  readonly confidence: number;
  readonly explanation: string;
  readonly detectedAt: string;
}

/** Factory for ContradictionLink. */
export function makeContradictionLink(
  subjectTripleId: string,
  objectTripleId: string,
  subjectEntityId: string,
  objectEntityId: string,
  severity: ContradictionSeverity,
  confidence: number,
  explanation: string,
): ContradictionLink {
  return Object.freeze({
    id: newId("contradiction"),
    subjectTripleId,
    objectTripleId,
    subjectEntityId,
    objectEntityId,
    severity,
    confidence,
    explanation,
    detectedAt: new Date().toISOString(),
  });
}

function classifySeverity(confidence: number): ContradictionSeverity {
  if (confidence >= 0.9) return "critical";
  if (confidence >= 0.75) return "high";
  if (confidence >= 0.5) return "medium";
  return "low";
}

/** Check if two triples directly contradict each other based on predicate opposition. */
function areContradictoryPredicates(a: Triple, b: Triple): boolean {
  const opposites: ReadonlyArray<[string, string]> = [
    ["supports", "contradicts"],
    ["contradicts", "supports"],
  ];
  if (a.subjectId !== b.subjectId || a.objectId !== b.objectId) return false;
  return opposites.some(([p1, p2]) => a.predicate === p1 && b.predicate === p2);
}

/** Check if two triples claim opposite things about the same subject+predicate. */
function areClaimConflicts(
  a: Triple,
  b: Triple,
  entities: ReadonlyMap<string, Entity>,
): boolean {
  if (a.subjectId !== b.subjectId) return false;
  if (a.predicate !== b.predicate) return false;
  if (a.objectId === b.objectId) return false;
  // Only flag high-confidence triples
  if (a.confidence < 0.6 || b.confidence < 0.6) return false;
  const objA = entities.get(a.objectId);
  const objB = entities.get(b.objectId);
  // Flag if both objects exist but differ (e.g. two conflicting dates or locations)
  if (!objA || !objB) return false;
  if (objA.type !== objB.type) return false;
  return objA.id !== objB.id;
}

/** Detect contradiction links within a set of triples and entities. */
export function detectContradictions(
  triples: ReadonlyArray<Triple>,
  entities: ReadonlyArray<Entity>,
): ReadonlyArray<ContradictionLink> {
  const entityMap = new Map(entities.map((e) => [e.id, e]));
  const links: ContradictionLink[] = [];
  const seenPairs = new Set<string>();

  for (let i = 0; i < triples.length; i++) {
    for (let j = i + 1; j < triples.length; j++) {
      const a = triples[i]!;
      const b = triples[j]!;
      const pairKey = [a.id, b.id].sort().join("::");
      if (seenPairs.has(pairKey)) continue;

      let detected = false;
      let confidence = 0;
      let explanation = "";

      if (areContradictoryPredicates(a, b)) {
        detected = true;
        confidence = Math.min(a.confidence, b.confidence) * 0.95;
        explanation = `Triple "${a.id}" (${a.predicate}) directly contradicts triple "${b.id}" (${b.predicate}) for the same subject-object pair.`;
      } else if (areClaimConflicts(a, b, entityMap)) {
        detected = true;
        confidence = Math.min(a.confidence, b.confidence) * 0.8;
        explanation = `Same predicate "${a.predicate}" on subject "${a.subjectId}" yields conflicting objects: "${a.objectId}" vs "${b.objectId}".`;
      }

      if (detected) {
        seenPairs.add(pairKey);
        links.push(
          makeContradictionLink(
            a.id,
            b.id,
            a.subjectId,
            b.subjectId,
            classifySeverity(confidence),
            confidence,
            explanation,
          ),
        );
      }
    }
  }

  return Object.freeze(links);
}
