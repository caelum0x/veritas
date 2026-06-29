// Unit tests for the Sourcify contract verifier, using an injected fetch (no
// network). The stub routes by whether the URL requests enrichment fields and
// returns a 404 for an unverified address (mirroring Sourcify's real behaviour).
import { test } from "node:test";
import assert from "node:assert/strict";
import { isOk } from "@veritas/core";
import { SourcifyContractVerify } from "../src/sources/sourcify-contract-verify.js";

const VERIFIED_ADDR = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";

const BARE = { match: "match", runtimeMatch: "match", creationMatch: "match", verifiedAt: "2024-08-08T13:20:07Z" };
const ENRICHED = {
  ...BARE,
  compilation: { name: "FiatTokenProxy", compilerVersion: "0.4.24+commit.e67f0147" },
  proxyResolution: { isProxy: true, implementations: [{ address: "0x43506849D7C04F9138D1A2050bbF3A0c054402dd" }] },
  deployment: { deployer: "0x95Ba4cF87D6723ad9C0Db21737D862bE80e93911" },
};

/** A verified contract: bare returns match, ?fields returns enrichment. */
function verifiedStub(): typeof fetch {
  return (async (url: string) => {
    const payload = url.includes("fields=") ? ENRICHED : BARE;
    return { ok: true, status: 200, json: async () => payload };
  }) as unknown as typeof fetch;
}

/** An unverified contract: Sourcify answers 404 with a match:null JSON body. */
function unverifiedStub(): typeof fetch {
  return (async () => ({
    ok: false,
    status: 404,
    json: async () => ({ match: null, runtimeMatch: null, creationMatch: null }),
  })) as unknown as typeof fetch;
}

test("verifyContract returns an enriched record for a verified contract", async () => {
  const src = new SourcifyContractVerify({ fetchImpl: verifiedStub() });
  const result = await src.verifyContract(VERIFIED_ADDR, 1);
  assert.ok(isOk(result));
  if (!isOk(result)) return;
  assert.equal(result.value.isVerified, true);
  assert.equal(result.value.contractName, "FiatTokenProxy");
  assert.equal(result.value.compilerVersion, "0.4.24+commit.e67f0147");
  assert.equal(result.value.isProxy, true);
  assert.equal(result.value.implementationAddress, "0x43506849D7C04F9138D1A2050bbF3A0c054402dd");
  assert.equal(result.value.deployer, "0x95Ba4cF87D6723ad9C0Db21737D862bE80e93911");
});

test("verifyContract treats a 404 as isVerified:false rather than an error", async () => {
  const src = new SourcifyContractVerify({ fetchImpl: unverifiedStub() });
  const result = await src.verifyContract("0x000000000000000000000000000000000000dead", 1);
  assert.ok(isOk(result));
  if (!isOk(result)) return;
  assert.equal(result.value.isVerified, false);
  assert.equal(result.value.contractName, undefined);
});

test("search extracts an address from keywords and yields a document", async () => {
  const src = new SourcifyContractVerify({ fetchImpl: verifiedStub() });
  const result = await src.search({ keywords: [`contract ${VERIFIED_ADDR}`], maxResults: 5 });
  assert.ok(isOk(result));
  if (!isOk(result)) return;
  assert.equal(result.value.length, 1);
  assert.equal(result.value[0]!.metadata["isVerified"], true);
});

test("a genuine HTTP error (5xx) surfaces as an Err result", async () => {
  const stub = (async () => ({ ok: false, status: 503, json: async () => ({}) })) as unknown as typeof fetch;
  const src = new SourcifyContractVerify({ fetchImpl: stub });
  const result = await src.verifyContract(VERIFIED_ADDR, 1);
  assert.equal(isOk(result), false);
});
