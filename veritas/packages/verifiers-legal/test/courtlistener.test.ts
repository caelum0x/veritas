// Unit tests for the CourtListener case-law source, using an injected fetch (no network).
import { test } from "node:test";
import assert from "node:assert/strict";
import { isOk } from "@veritas/core";
import { CourtListenerCaseLawSource } from "../src/sources/courtlistener-caselaw.js";

const CANNED = {
  count: 1,
  results: [
    {
      cluster_id: 2498575,
      absolute_url: "/opinion/2498575/best-v-miranda/",
      caseName: "Best v. Miranda",
      court: "Court of Appeals of Arizona",
      court_jurisdiction: "Arizona",
      dateFiled: "2012-03-15",
      docketNumber: "1 CA-CV 10-0886",
      citation: ["274 P.3d 516", "229 Ariz. 246"],
      status: "Published",
      syllabus: "The court addressed the application of Miranda warnings.",
    },
  ],
};

function stubFetch(payload: unknown, status = 200): typeof fetch {
  return (async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  })) as unknown as typeof fetch;
}

test("searchCases maps a CourtListener opinion into a SourceDocument", async () => {
  const src = new CourtListenerCaseLawSource({ fetchImpl: stubFetch(CANNED) });
  const result = await src.searchCases({ keywords: ["Miranda"], maxResults: 5 });
  assert.ok(isOk(result));
  if (!isOk(result)) return;

  assert.equal(result.value.length, 1);
  const doc = result.value[0]!;
  assert.equal(doc.id, "2498575");
  assert.match(doc.url, /courtlistener\.com\/opinion\/2498575/);
  assert.match(doc.title, /Best v\. Miranda, 274 P\.3d 516/);
  assert.equal(doc.metadata["court"], "Court of Appeals of Arizona");
  assert.equal(doc.metadata["precedentialStatus"], "binding");
  assert.equal(doc.publishedAt, "2012-03-15T00:00:00.000Z");
});

test("an HTTP error surfaces as an Err result", async () => {
  const src = new CourtListenerCaseLawSource({ fetchImpl: stubFetch({}, 500) });
  const result = await src.search({ keywords: ["x"], maxResults: 1 });
  assert.equal(isOk(result), false);
});
