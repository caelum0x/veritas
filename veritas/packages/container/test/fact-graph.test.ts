// Test the EvidenceGraphService wiring: a VerificationReport -> fact graph.
import { test } from "node:test";
import assert from "node:assert/strict";
import { Container } from "../src/container.js";
import { EVIDENCE_GRAPH_SVC } from "../src/tokens.js";
import { registerFactGraphModule } from "../src/modules/fact-graph.module.js";

const REPORT = {
  schema: "veritas.report.v1",
  summary: "1 supported.",
  trustScore: 90,
  counts: { supported: 1, refuted: 0, unverifiable: 0 },
  claims: [
    {
      claim: "Bitcoin launched in 2009.",
      verdict: "SUPPORTED",
      confidence: 0.97,
      reasoning: "...",
      citations: [
        { url: "https://bitcoin.org", title: "bitcoin.org", quote: null, supports: true },
      ],
    },
  ],
  provenance: {},
} as never;

test("EvidenceGraphService projects a report into a fact graph", () => {
  const c = new Container();
  registerFactGraphModule(c);
  const svc = c.resolve(EVIDENCE_GRAPH_SVC);

  const { stats } = svc.fromReport(REPORT);
  // 1 claim entity + 1 source entity; 1 support relation + triple.
  assert.equal(stats.entityCount, 2);
  assert.equal(stats.relationCount, 1);
  assert.equal(stats.tripleCount, 1);
});
