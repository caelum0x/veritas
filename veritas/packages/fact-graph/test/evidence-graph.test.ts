// Unit tests for buildEvidenceGraph — projecting verified claims into a fact graph.
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildEvidenceGraph } from "../src/evidence-graph.js";
import type { EvidenceClaim } from "../src/evidence-graph.js";

const CLAIMS: EvidenceClaim[] = [
  {
    claim: "The Eiffel Tower is in Paris.",
    verdict: "SUPPORTED",
    confidence: 0.99,
    citations: [
      { url: "https://en.wikipedia.org/wiki/Eiffel_Tower", title: "Eiffel Tower", supports: true },
      { url: "https://www.toureiffel.paris", title: "Official site", supports: true },
    ],
  },
  {
    claim: "The Eiffel Tower is taller than the Burj Khalifa.",
    verdict: "REFUTED",
    confidence: 0.95,
    citations: [
      // Reuses the wikipedia source → deduped to one entity, two relations.
      { url: "https://en.wikipedia.org/wiki/Eiffel_Tower", title: "Eiffel Tower", supports: false },
    ],
  },
];

test("builds a graph with one entity per claim and per unique source", () => {
  const { stats } = buildEvidenceGraph(CLAIMS);
  // 2 claim entities + 2 unique source entities (wikipedia is shared).
  assert.equal(stats.entityCount, 4);
  // 3 citations total → 3 relations + 3 triples.
  assert.equal(stats.relationCount, 3);
  assert.equal(stats.tripleCount, 3);
});

test("support and refutation citations produce typed relations", () => {
  const { graph } = buildEvidenceGraph(CLAIMS);
  const types = [...graph.relations.values()].map((r) => r.type).sort();
  assert.deepEqual(types, ["contradicts", "supports", "supports"]);
});

test("an empty claim set yields an empty graph", () => {
  const { stats } = buildEvidenceGraph([]);
  assert.equal(stats.entityCount, 0);
  assert.equal(stats.relationCount, 0);
});
