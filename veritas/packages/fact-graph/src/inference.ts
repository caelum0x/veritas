// inference.ts: simple forward-chaining inference rules over fact-graph triples and entities.

import { newRelationId, makeRelation, type Relation } from "./relation.js";
import { newTripleId, makeTriple, type Triple } from "./triple.js";
import type { Entity } from "./entity.js";

/** A single inferred fact produced by a rule. */
export interface InferredTriple {
  readonly triple: Triple;
  readonly relation: Relation;
  readonly ruleId: string;
  readonly explanation: string;
}

/** Result of applying all inference rules. */
export interface InferenceResult {
  readonly inferred: ReadonlyArray<InferredTriple>;
  readonly appliedRules: ReadonlyArray<string>;
  readonly durationMs: number;
}

/** Context passed to inference rules. */
export interface InferenceContext {
  readonly entities: ReadonlyArray<Entity>;
  readonly relations: ReadonlyArray<Relation>;
  readonly triples: ReadonlyArray<Triple>;
}

/** A single inference rule. */
export interface InferenceRule {
  readonly id: string;
  readonly description: string;
  apply(ctx: InferenceContext): ReadonlyArray<InferredTriple>;
}

/** Transitivity of "locatedIn": A locatedIn B ∧ B locatedIn C → A locatedIn C. */
const transitiveLocationRule: InferenceRule = {
  id: "transitive-location",
  description: "locatedIn is transitive: if A is located in B and B is located in C then A is located in C",
  apply(ctx) {
    const inferred: InferredTriple[] = [];
    const locatedIn = ctx.triples.filter((t) => t.predicate === "locatedIn");
    const existingKeys = new Set(ctx.triples.map((t) => `${t.subjectId}::${t.predicate}::${t.objectId}`));

    for (const t1 of locatedIn) {
      for (const t2 of locatedIn) {
        if (t1.objectId !== t2.subjectId) continue;
        const key = `${t1.subjectId}::locatedIn::${t2.objectId}`;
        if (existingKeys.has(key)) continue;
        existingKeys.add(key);
        const relation = makeRelation(t1.subjectId as never, t2.objectId as never, "locatedIn" as never, {
          weight: Math.min(t1.confidence, t2.confidence) * 0.9,
          label: `inferred-transitive-location`,
        });
        const triple = makeTriple(
          t1.subjectId as never,
          "locatedIn" as never,
          t2.objectId as never,
          relation.id,
          t1.claimId,
          { confidence: relation.weight },
        );
        inferred.push({
          triple,
          relation,
          ruleId: "transitive-location",
          explanation: `${t1.subjectId} locatedIn ${t2.objectId} (via ${t1.objectId})`,
        });
      }
    }
    return inferred;
  },
};

/** Contradiction symmetry: if A contradicts B then B contradicts A. */
const contradictionSymmetryRule: InferenceRule = {
  id: "contradiction-symmetry",
  description: "contradicts is symmetric: if A contradicts B then B contradicts A",
  apply(ctx) {
    const inferred: InferredTriple[] = [];
    const contradicts = ctx.triples.filter((t) => t.predicate === "contradicts");
    const existingKeys = new Set(ctx.triples.map((t) => `${t.subjectId}::${t.predicate}::${t.objectId}`));

    for (const t of contradicts) {
      const key = `${t.objectId}::contradicts::${t.subjectId}`;
      if (existingKeys.has(key)) continue;
      existingKeys.add(key);
      const relation = makeRelation(t.objectId as never, t.subjectId as never, "contradicts" as never, {
        weight: t.confidence * 0.95,
        label: "inferred-symmetric-contradiction",
      });
      const triple = makeTriple(
        t.objectId as never,
        "contradicts" as never,
        t.subjectId as never,
        relation.id,
        t.claimId,
        { confidence: relation.weight },
      );
      inferred.push({
        triple,
        relation,
        ruleId: "contradiction-symmetry",
        explanation: `${t.objectId} contradicts ${t.subjectId} (symmetric of inverse)`,
      });
    }
    return inferred;
  },
};

/** Support inheritance: if A supports B and B supports C, A weakly supports C. */
const supportTransitivityRule: InferenceRule = {
  id: "support-transitivity",
  description: "supports is weakly transitive: if A supports B and B supports C then A weakly supports C",
  apply(ctx) {
    const inferred: InferredTriple[] = [];
    const supports = ctx.triples.filter((t) => t.predicate === "supports");
    const existingKeys = new Set(ctx.triples.map((t) => `${t.subjectId}::${t.predicate}::${t.objectId}`));

    for (const t1 of supports) {
      for (const t2 of supports) {
        if (t1.objectId !== t2.subjectId) continue;
        const key = `${t1.subjectId}::supports::${t2.objectId}`;
        if (existingKeys.has(key)) continue;
        existingKeys.add(key);
        const confidence = t1.confidence * t2.confidence * 0.8; // decay factor
        const relation = makeRelation(t1.subjectId as never, t2.objectId as never, "supports" as never, {
          weight: confidence,
          label: "inferred-transitive-support",
        });
        const triple = makeTriple(
          t1.subjectId as never,
          "supports" as never,
          t2.objectId as never,
          relation.id,
          t1.claimId,
          { confidence },
        );
        inferred.push({
          triple,
          relation,
          ruleId: "support-transitivity",
          explanation: `${t1.subjectId} supports ${t2.objectId} (transitive via ${t1.objectId})`,
        });
      }
    }
    return inferred;
  },
};

/** Built-in rule set. */
export const builtinRules: ReadonlyArray<InferenceRule> = Object.freeze([
  transitiveLocationRule,
  contradictionSymmetryRule,
  supportTransitivityRule,
]);

/** Apply a set of inference rules, returning new inferred triples (not already in the graph). */
export function applyInferenceRules(
  ctx: InferenceContext,
  rules: ReadonlyArray<InferenceRule> = builtinRules,
): InferenceResult {
  const start = Date.now();
  const allInferred: InferredTriple[] = [];
  const appliedRules: string[] = [];

  for (const rule of rules) {
    const results = rule.apply(ctx);
    if (results.length > 0) {
      allInferred.push(...results);
      appliedRules.push(rule.id);
    }
  }

  return Object.freeze({
    inferred: Object.freeze(allInferred),
    appliedRules: Object.freeze(appliedRules),
    durationMs: Date.now() - start,
  });
}
