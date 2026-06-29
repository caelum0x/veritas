// Unit tests for the NLM Clinical Tables ICD-10-CM source, using an injected
// fetch (no network). The stub returns the API's [total, codes, _, pairs] shape.
import { test } from "node:test";
import assert from "node:assert/strict";
import { isOk } from "@veritas/core";
import { NlmIcdSource } from "../src/sources/nlm-icd.js";

const PAIRS: [string, string][] = [
  ["E11.65", "Type 2 diabetes mellitus with hyperglycemia"],
  ["E11.9", "Type 2 diabetes mellitus without complications"],
];

function icdStub(pairs: [string, string][] = PAIRS, status = 200): typeof fetch {
  return (async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => [pairs.length, pairs.map((p) => p[0]), null, pairs],
  })) as unknown as typeof fetch;
}

test("search maps NLM pairs into SourceDocuments with icd metadata", async () => {
  const src = new NlmIcdSource({ fetchImpl: icdStub() });
  const result = await src.search({ keywords: ["type 2 diabetes"], maxResults: 5 });
  assert.ok(isOk(result));
  if (!isOk(result)) return;
  assert.equal(result.value.length, 2);
  assert.equal(result.value[0]!.metadata["icdCode"], "E11.65");
  assert.equal(result.value[0]!.metadata["icdVersion"], "ICD-10");
  assert.equal(result.value[1]!.title, "E11.9: Type 2 diabetes mellitus without complications");
});

test("lookupCode returns the exact-matching entry", async () => {
  const src = new NlmIcdSource({ fetchImpl: icdStub() });
  const result = await src.lookupCode("E11.9");
  assert.ok(isOk(result));
  if (!isOk(result)) return;
  assert.equal(result.value.code, "E11.9");
  assert.equal(result.value.description, "Type 2 diabetes mellitus without complications");
  assert.equal(result.value.version, "ICD-10");
});

test("lookupCode returns Err when no exact code matches", async () => {
  const src = new NlmIcdSource({ fetchImpl: icdStub([["E10.9", "Type 1 diabetes mellitus without complications"]]) });
  const result = await src.lookupCode("E11.9");
  assert.equal(isOk(result), false);
});

test("searchByDescription returns parsed entries", async () => {
  const src = new NlmIcdSource({ fetchImpl: icdStub() });
  const result = await src.searchByDescription("diabetes", 5);
  assert.ok(isOk(result));
  if (!isOk(result)) return;
  assert.equal(result.value.length, 2);
});

test("an HTTP error surfaces as an Err result", async () => {
  const src = new NlmIcdSource({ fetchImpl: icdStub(PAIRS, 500) });
  const result = await src.search({ keywords: ["diabetes"], maxResults: 5 });
  assert.equal(isOk(result), false);
});
