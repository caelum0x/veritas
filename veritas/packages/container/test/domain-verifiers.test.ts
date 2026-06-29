// Tests for the domain-verifier router wiring. These exercise only non-network
// routing paths (no scientific claims) to keep the suite deterministic and offline.
import { test } from "node:test";
import assert from "node:assert/strict";
import { noopLogger } from "@veritas/core";
import { MockProvider } from "@veritas/llm";
import type { DataSourcePort } from "@veritas/verifier-kit";
import { buildDomainRouter } from "../src/modules/domain-verifiers.module.js";

// Offline router: an empty sources map means every verifier runs rule-only with
// no network access, keeping these tests deterministic.
const NO_SOURCES: ReadonlyMap<string, DataSourcePort> = new Map();
const offlineRouter = () => buildDomainRouter(new MockProvider(), NO_SOURCES, noopLogger);

test("router returns null for a claim no specialized verifier handles", async () => {
  const verdict = await offlineRouter().verify("My favourite colour is teal.");
  assert.equal(verdict, null);
});

test("router routes a legal claim to the legal verifier and returns a verdict", async () => {
  const verdict = await offlineRouter().verify(
    "The Supreme Court held that the statute violated constitutional due process under the Fourteenth Amendment.",
  );
  assert.notEqual(verdict, null);
  assert.ok(["SUPPORTED", "REFUTED", "UNVERIFIABLE"].includes(verdict!.verdict));
  assert.ok(verdict!.verifierId.length > 0);
});
