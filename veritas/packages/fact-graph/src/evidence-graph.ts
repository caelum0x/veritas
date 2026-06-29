// Evidence graph: build a fact graph from real verification output. Each claim
// becomes a concept entity; each cited source becomes an organization entity;
// support/refutation citations become typed relations + triples. This is a
// deterministic projection of verified data — no NLP guessing, no mock data.

import { isOk } from "@veritas/core";
import { type Entity, makeEntity } from "./entity.js";
import { makeRelation } from "./relation.js";
import { makeTriple } from "./triple.js";
import { type FactGraph, emptyGraph, addEntity, addRelation, addTriple, graphStats } from "./graph.js";

/** A single cited source attached to a verified claim. */
export interface EvidenceCitation {
  readonly url: string;
  readonly title: string | null;
  /** True when the source supports the claim; false when it refutes it. */
  readonly supports: boolean;
}

/** A verified claim with its verdict and supporting/refuting citations. */
export interface EvidenceClaim {
  readonly claim: string;
  readonly verdict: string;
  readonly confidence?: number;
  readonly citations: ReadonlyArray<EvidenceCitation>;
}

/** Result of building an evidence graph. */
export interface EvidenceGraph {
  readonly graph: FactGraph;
  readonly stats: ReturnType<typeof graphStats>;
}

/** Apply a Result-returning graph mutation, keeping the prior graph on error. */
function apply(graph: FactGraph, next: ReturnType<typeof addEntity>): FactGraph {
  return isOk(next) ? next.value : graph;
}

/**
 * Build an evidence graph from a set of verified claims.
 *
 * Source entities are de-duplicated by URL across the whole graph, so a source
 * cited by multiple claims appears once with multiple relations.
 */
export function buildEvidenceGraph(claims: ReadonlyArray<EvidenceClaim>): EvidenceGraph {
  let graph = emptyGraph();
  const sourcesByUrl = new Map<string, Entity>();

  claims.forEach((c, i) => {
    const claimId = `claim-${i}`;
    const claimEntity = makeEntity(c.claim, "concept", {
      confidence: c.confidence,
      metadata: { verdict: c.verdict },
    });
    graph = apply(graph, addEntity(graph, claimEntity));

    for (const cite of c.citations) {
      let source = sourcesByUrl.get(cite.url);
      if (source === undefined) {
        source = makeEntity(cite.title ?? cite.url, "organization", {
          metadata: { url: cite.url },
        });
        sourcesByUrl.set(cite.url, source);
        graph = apply(graph, addEntity(graph, source));
      }

      const predicate = cite.supports ? "supports" : "contradicts";
      const relation = makeRelation(source.id, claimEntity.id, predicate, {
        metadata: { url: cite.url },
      });
      graph = apply(graph, addRelation(graph, relation));
      graph = apply(
        graph,
        addTriple(graph, makeTriple(source.id, predicate, claimEntity.id, relation.id, claimId)),
      );
    }
  });

  return { graph, stats: graphStats(graph) };
}
