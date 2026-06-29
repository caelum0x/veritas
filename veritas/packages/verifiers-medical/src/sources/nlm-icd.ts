// NlmIcdSource: a real, keyless IcdPort backed by the U.S. National Library of
// Medicine Clinical Tables ICD-10-CM API
// (https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search). `fetchImpl` is
// injectable for tests. No API key is required.
import { ok, err, type Result } from "@veritas/core";
import type { SourceDocument, SourceQuery } from "@veritas/verifier-kit";
import type { IcdPort, IcdCodeEntry } from "./icd.js";

const DEFAULT_BASE_URL = "https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search";
const DEFAULT_TIMEOUT_MS = 12_000;
const DEFAULT_MAX_RESULTS = 10;

/** Build a stable, human-facing lookup URL for an ICD-10-CM code. */
function codeUrl(code: string): string {
  return `https://www.icd10data.com/search?s=${encodeURIComponent(code)}`;
}

/**
 * Map an NLM [code, description] pair onto the IcdCodeEntry contract. The
 * Clinical Tables API returns only code + name for ICD-10-CM; structural fields
 * (block/chapter/excludes) are not exposed, so they are left empty rather than
 * fabricated.
 */
function pairToEntry(code: string, description: string): IcdCodeEntry {
  return {
    code,
    version: "ICD-10",
    description,
    category: description,
    block: "",
    chapter: "",
    inclusionTerms: [],
    excludes1: [],
    excludes2: [],
    url: codeUrl(code),
  };
}

function entryToDoc(e: IcdCodeEntry): SourceDocument {
  return {
    id: e.code,
    url: e.url,
    title: `${e.code}: ${e.description}`,
    snippet: `${e.version} diagnosis code ${e.code} — ${e.description}`,
    publishedAt: null,
    metadata: {
      icdCode: e.code,
      icdVersion: e.version,
      description: e.description,
    },
  };
}

export interface NlmIcdSourceOptions {
  /** Fetch implementation; defaults to the global `fetch`. */
  readonly fetchImpl?: typeof fetch;
  /** Per-request timeout in milliseconds. */
  readonly timeoutMs?: number;
  /** API base URL override. */
  readonly baseUrl?: string;
}

/** Real IcdPort backed by the NLM Clinical Tables ICD-10-CM API. */
export class NlmIcdSource implements IcdPort {
  readonly sourceId = "icd-codes";
  readonly displayName = "NLM Clinical Tables ICD-10-CM";

  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;
  private readonly baseUrl: string;

  constructor(options: NlmIcdSourceOptions = {}) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
  }

  async lookupCode(code: string): Promise<Result<IcdCodeEntry, Error>> {
    const result = await this.query(code, DEFAULT_MAX_RESULTS);
    if (!result.ok) return err(result.error);
    const target = code.toUpperCase();
    const match = result.value.find((e) => e.code.toUpperCase() === target);
    if (match === undefined) return err(new Error(`ICD: code not found: ${code}`));
    return ok(match);
  }

  async searchByDescription(
    keyword: string,
    maxResults = DEFAULT_MAX_RESULTS,
  ): Promise<Result<readonly IcdCodeEntry[], Error>> {
    return this.query(keyword, maxResults);
  }

  async search(query: SourceQuery): Promise<Result<readonly SourceDocument[], Error>> {
    const term = query.keywords.join(" ").trim();
    if (term.length === 0) return ok([]);
    const result = await this.query(term, query.maxResults);
    if (!result.ok) return err(result.error);
    return ok(result.value.map(entryToDoc));
  }

  async fetch(id: string): Promise<Result<SourceDocument, Error>> {
    const result = await this.lookupCode(id);
    if (!result.ok) return err(result.error);
    return ok(entryToDoc(result.value));
  }

  /** Query the Clinical Tables API and parse its [total, codes, _, pairs] shape. */
  private async query(terms: string, maxResults: number): Promise<Result<readonly IcdCodeEntry[], Error>> {
    const url =
      `${this.baseUrl}?sf=code,name&terms=${encodeURIComponent(terms)}` +
      `&maxList=${Math.max(1, Math.min(maxResults, 50))}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImpl(url, {
        headers: { Accept: "application/json", "User-Agent": "veritas-verifiers-medical" },
        signal: controller.signal,
      });
      if (!response.ok) return err(new Error(`NLM ICD request failed: HTTP ${response.status}`));
      const json: unknown = await response.json();
      if (!Array.isArray(json) || json.length < 4) {
        return err(new Error("NLM ICD: unexpected response shape"));
      }
      const pairs = json[3];
      if (!Array.isArray(pairs)) return ok([]);
      const entries = pairs
        .filter((p): p is [string, string] => Array.isArray(p) && typeof p[0] === "string" && typeof p[1] === "string")
        .map(([code, description]) => pairToEntry(code, description));
      return ok(entries);
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    } finally {
      clearTimeout(timer);
    }
  }
}

/** Factory returning the real NLM-backed ICD-10-CM source. */
export function createNlmIcdSource(options: NlmIcdSourceOptions = {}): IcdPort {
  return new NlmIcdSource(options);
}
