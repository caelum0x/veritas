// Unit tests for the openFDA drug source, using an injected fetch (no network).
import { test } from "node:test";
import assert from "node:assert/strict";
import { isOk } from "@veritas/core";
import { OpenFdaDrugSource } from "../src/sources/openfda-drug.js";

const CANNED = {
  results: [
    {
      id: "label-1",
      effective_time: "20230115",
      indications_and_usage: ["Indicated to reduce LDL cholesterol in adults."],
      contraindications: ["Active liver disease.", "Pregnancy."],
      drug_interactions: ["cyclosporine", "clarithromycin"],
      openfda: {
        brand_name: ["Lipitor"],
        generic_name: ["ATORVASTATIN CALCIUM"],
        manufacturer_name: ["Pfizer Inc."],
        product_ndc: ["0069-0150-68"],
        route: ["ORAL"],
        dosage_form: ["TABLET"],
        pharm_class_epc: ["HMG-CoA Reductase Inhibitor [EPC]"],
        spl_set_id: ["set-abc-123"],
      },
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

test("search maps an openFDA label into a SourceDocument with rich metadata", async () => {
  const src = new OpenFdaDrugSource({ fetchImpl: stubFetch(CANNED) });
  const result = await src.search({ keywords: ["Lipitor"], maxResults: 5 });
  assert.ok(isOk(result));
  if (!isOk(result)) return;

  assert.equal(result.value.length, 1);
  const doc = result.value[0]!;
  assert.equal(doc.id, "0069-0150-68");
  assert.match(doc.title, /Lipitor/);
  assert.equal(doc.metadata["drugClass"], "HMG-CoA Reductase Inhibitor [EPC]");
  assert.equal(doc.metadata["approvalStatus"], "approved");
  assert.equal(doc.publishedAt, "2023-01-15T00:00:00.000Z");
  assert.equal(doc.metadata["contraindicationsCount"], 2);
});

test("lookupByName returns typed DrugRecords", async () => {
  const src = new OpenFdaDrugSource({ fetchImpl: stubFetch(CANNED) });
  const result = await src.lookupByName("atorvastatin");
  assert.ok(isOk(result));
  if (!isOk(result)) return;
  assert.equal(result.value[0]!.brandName, "Lipitor");
  assert.equal(result.value[0]!.genericName, "ATORVASTATIN CALCIUM");
});

test("a 404 (no matches) yields an empty result, not an error", async () => {
  const src = new OpenFdaDrugSource({ fetchImpl: stubFetch({ error: "NOT_FOUND" }, 404) });
  const result = await src.search({ keywords: ["nonexistentdrugxyz"], maxResults: 5 });
  assert.ok(isOk(result));
  if (!isOk(result)) return;
  assert.equal(result.value.length, 0);
});
