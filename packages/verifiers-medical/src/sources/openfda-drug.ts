// OpenFdaDrugSource: a real, keyless DrugDbPort backed by the public openFDA drug-label API.
// openFDA requires no API key (an optional key raises rate limits). `fetchImpl` is injectable for tests.
import { ok, err, type Result } from "@veritas/core";
import type { SourceDocument, SourceQuery } from "@veritas/verifier-kit";
import type { DrugDbPort, DrugRecord } from "./drug-db.js";

/** Subset of an openFDA drug-label result we consume. */
interface OpenFdaLabel {
  readonly id?: string;
  readonly effective_time?: string;
  readonly indications_and_usage?: readonly string[];
  readonly contraindications?: readonly string[];
  readonly drug_interactions?: readonly string[];
  readonly openfda?: {
    readonly brand_name?: readonly string[];
    readonly generic_name?: readonly string[];
    readonly manufacturer_name?: readonly string[];
    readonly product_ndc?: readonly string[];
    readonly route?: readonly string[];
    readonly dosage_form?: readonly string[];
    readonly pharm_class_epc?: readonly string[];
    readonly spl_set_id?: readonly string[];
  };
}

/** Configuration for the openFDA drug source. */
export interface OpenFdaDrugSourceOptions {
  /** Fetch implementation; defaults to the global `fetch`. */
  readonly fetchImpl?: typeof fetch;
  /** Optional openFDA API key (raises rate limits; not required). */
  readonly apiKey?: string;
  /** Per-request timeout in milliseconds. */
  readonly timeoutMs?: number;
  /** API base URL override. */
  readonly baseUrl?: string;
}

const DEFAULT_BASE_URL = "https://api.fda.gov/drug/label.json";
const DEFAULT_TIMEOUT_MS = 10_000;

/** Convert an openFDA `effective_time` (YYYYMMDD) into an ISO date string. */
function toIsoDate(yyyymmdd: string | undefined): string | null {
  if (!yyyymmdd || yyyymmdd.length < 8) return null;
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}T00:00:00.000Z`;
}

function first(arr: readonly string[] | undefined): string | undefined {
  return arr && arr.length > 0 ? arr[0] : undefined;
}

/** Map an openFDA label onto the strongly-typed DrugRecord shape. */
function toDrugRecord(label: OpenFdaLabel): DrugRecord {
  const fda = label.openfda ?? {};
  const setId = first(fda.spl_set_id);
  return {
    ndc: first(fda.product_ndc) ?? label.id ?? "unknown",
    brandName: first(fda.brand_name) ?? "(unknown brand)",
    genericName: first(fda.generic_name) ?? "(unknown generic)",
    manufacturer: first(fda.manufacturer_name) ?? "Unknown",
    dosageForm: first(fda.dosage_form) ?? "unknown",
    route: first(fda.route) ?? "unknown",
    // A published drug label implies an actively marketed (approved) product.
    approvalStatus: "approved",
    approvedDate: toIsoDate(label.effective_time),
    labelUrl: setId
      ? `https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=${setId}`
      : "https://labels.fda.gov/",
    interactions: label.drug_interactions ?? [],
    contraindications: label.contraindications ?? [],
  };
}

/** Map a DrugRecord (+ source label) onto the generic SourceDocument contract. */
function toSourceDocument(record: DrugRecord, label: OpenFdaLabel): SourceDocument {
  const fda = label.openfda ?? {};
  return {
    id: record.ndc,
    url: record.labelUrl,
    title: `${record.brandName} (${record.genericName})`,
    snippet:
      first(label.indications_and_usage)?.slice(0, 300) ??
      `Dosage form: ${record.dosageForm}. Route: ${record.route}. Status: ${record.approvalStatus}.`,
    publishedAt: record.approvedDate,
    metadata: {
      drugId: record.ndc,
      genericName: record.genericName,
      brandNames: fda.brand_name ?? [record.brandName],
      drugClass: first(fda.pharm_class_epc) ?? "",
      approvalStatus: record.approvalStatus,
      approvalDate: record.approvedDate,
      indications: label.indications_and_usage ?? [],
      contraindicationsCount: record.contraindications.length,
      manufacturer: record.manufacturer,
      interactions: record.interactions,
      contraindications: record.contraindications,
    },
  };
}

/** Real DrugDbPort querying the public openFDA drug-label API over HTTPS. */
export class OpenFdaDrugSource implements DrugDbPort {
  readonly sourceId = "drug-db";
  readonly displayName = "openFDA Drug Labels";

  private readonly fetchImpl: typeof fetch;
  private readonly apiKey: string | undefined;
  private readonly timeoutMs: number;
  private readonly baseUrl: string;

  constructor(options: OpenFdaDrugSourceOptions = {}) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.apiKey = options.apiKey;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
  }

  async search(query: SourceQuery): Promise<Result<readonly SourceDocument[], Error>> {
    const terms = query.keywords
      .filter((k) => k.trim().length > 1)
      .map((k) => `(openfda.brand_name:"${k}"+openfda.generic_name:"${k}")`)
      .join("+");
    const search = terms.length > 0 ? terms : "_exists_:openfda.brand_name";

    const labels = await this.queryLabels(search, Math.max(1, query.maxResults));
    if (!labels.ok) return err(labels.error);
    return ok(labels.value.map((l) => toSourceDocument(toDrugRecord(l), l)));
  }

  async fetch(id: string): Promise<Result<SourceDocument, Error>> {
    const result = await this.lookupByNdc(id);
    if (!result.ok) return err(result.error);
    // Re-query to obtain the full label for the document body.
    const labels = await this.queryLabels(`openfda.product_ndc:"${id}"`, 1);
    const label = labels.ok ? labels.value[0] : undefined;
    return ok(toSourceDocument(result.value, label ?? {}));
  }

  async lookupByName(name: string): Promise<Result<readonly DrugRecord[], Error>> {
    const search = `(openfda.brand_name:"${name}"+openfda.generic_name:"${name}")`;
    const labels = await this.queryLabels(search, 5);
    if (!labels.ok) return err(labels.error);
    return ok(labels.value.map(toDrugRecord));
  }

  async lookupByNdc(ndc: string): Promise<Result<DrugRecord, Error>> {
    const labels = await this.queryLabels(`openfda.product_ndc:"${ndc}"`, 1);
    if (!labels.ok) return err(labels.error);
    const label = labels.value[0];
    if (label === undefined) return err(new Error(`openFDA: NDC not found: ${ndc}`));
    return ok(toDrugRecord(label));
  }

  /** Execute an openFDA label query and return the raw results array. */
  private async queryLabels(search: string, limit: number): Promise<Result<readonly OpenFdaLabel[], Error>> {
    const params = new URLSearchParams();
    params.set("search", search);
    params.set("limit", String(limit));
    if (this.apiKey) params.set("api_key", this.apiKey);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImpl(`${this.baseUrl}?${params.toString()}`, {
        headers: { Accept: "application/json", "User-Agent": "veritas-verifiers-medical" },
        signal: controller.signal,
      });
      // openFDA returns 404 with an error body when a query matches nothing.
      if (response.status === 404) return ok([]);
      if (!response.ok) return err(new Error(`openFDA request failed: HTTP ${response.status}`));
      const json = (await response.json()) as { results?: OpenFdaLabel[] };
      return ok(Array.isArray(json.results) ? json.results : []);
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    } finally {
      clearTimeout(timer);
    }
  }
}

/** Factory returning the real openFDA drug source. */
export function createOpenFdaDrugSource(options: OpenFdaDrugSourceOptions = {}): DrugDbPort {
  return new OpenFdaDrugSource(options);
}
