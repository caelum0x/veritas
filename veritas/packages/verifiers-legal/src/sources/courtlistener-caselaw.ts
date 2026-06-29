// CourtListenerCaseLawSource: a real, keyless CaseLawSourcePort backed by the public
// CourtListener REST API (v4). No API key is required for read access. `fetchImpl`
// is injectable for tests.
import { ok, err, type Result } from "@veritas/core";
import type { SourceDocument } from "@veritas/verifier-kit";
import type { CaseLawSourcePort, CaseLawQuery, CaseLawMetadata } from "./case-law.js";

/** Subset of a CourtListener v4 opinion search result we consume. */
interface CourtListenerResult {
  readonly cluster_id?: number;
  readonly absolute_url?: string;
  readonly caseName?: string;
  readonly court?: string;
  readonly court_jurisdiction?: string;
  readonly dateFiled?: string;
  readonly docketNumber?: string;
  readonly citation?: readonly string[];
  readonly status?: string;
  readonly syllabus?: string;
  readonly opinions?: ReadonlyArray<{ snippet?: string }>;
}

/** Configuration for the CourtListener source. */
export interface CourtListenerSourceOptions {
  /** Fetch implementation; defaults to the global `fetch`. */
  readonly fetchImpl?: typeof fetch;
  /** Optional CourtListener API token (raises rate limits; not required). */
  readonly apiToken?: string;
  /** Per-request timeout in milliseconds. */
  readonly timeoutMs?: number;
  /** API base URL override. */
  readonly baseUrl?: string;
}

const DEFAULT_BASE_URL = "https://www.courtlistener.com";
const DEFAULT_TIMEOUT_MS = 12_000;

/** Map a CourtListener precedential status onto the verifier's enum. */
function toPrecedentialStatus(status: string | undefined): CaseLawMetadata["precedentialStatus"] {
  switch (status) {
    case "Published":
      return "binding";
    case "Unpublished":
      return "non-precedential";
    default:
      return "persuasive";
  }
}

/** Convert a CourtListener `dateFiled` (YYYY-MM-DD) into an ISO timestamp. */
function toIso(date: string | undefined): string | null {
  if (!date || date.length < 10) return null;
  return `${date.slice(0, 10)}T00:00:00.000Z`;
}

/** Map a CourtListener result onto the generic SourceDocument contract. */
function toSourceDocument(r: CourtListenerResult): SourceDocument {
  const id = r.cluster_id !== undefined ? String(r.cluster_id) : (r.absolute_url ?? "unknown");
  const caseName = r.caseName ?? "(unknown case)";
  const citation = r.citation?.[0] ?? "";
  const decisionDate = toIso(r.dateFiled);
  return {
    id,
    url: r.absolute_url ? `${DEFAULT_BASE_URL}${r.absolute_url}` : DEFAULT_BASE_URL,
    title: citation ? `${caseName}, ${citation}` : caseName,
    snippet: r.syllabus ?? r.opinions?.[0]?.snippet ?? caseName,
    publishedAt: decisionDate,
    metadata: {
      court: r.court ?? "Unknown Court",
      jurisdiction: r.court_jurisdiction ?? "US",
      docketNumber: r.docketNumber ?? "",
      decisionDate,
      citation,
      parties: caseName,
      precedentialStatus: toPrecedentialStatus(r.status),
    } satisfies CaseLawMetadata,
  };
}

/** Real CaseLawSourcePort querying the CourtListener v4 API over HTTPS. */
export class CourtListenerCaseLawSource implements CaseLawSourcePort {
  readonly sourceId = "case-law";
  readonly displayName = "CourtListener";

  private readonly fetchImpl: typeof fetch;
  private readonly apiToken: string | undefined;
  private readonly timeoutMs: number;
  private readonly baseUrl: string;

  constructor(options: CourtListenerSourceOptions = {}) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.apiToken = options.apiToken;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
  }

  async search(query: CaseLawQuery): Promise<Result<readonly SourceDocument[], Error>> {
    return this.searchCases(query);
  }

  async searchCases(query: CaseLawQuery): Promise<Result<readonly SourceDocument[], Error>> {
    const params = new URLSearchParams();
    params.set("type", "o"); // opinions
    const q = query.keywords.join(" ").trim();
    if (q.length > 0) params.set("q", q);
    if (query.court) params.set("court", query.court);
    if (query.after) params.set("filed_after", query.after.slice(0, 10));

    const result = await this.getJson(`${this.baseUrl}/api/rest/v4/search/?${params.toString()}`);
    if (!result.ok) return err(result.error);

    const results = (result.value as { results?: CourtListenerResult[] }).results;
    if (!Array.isArray(results)) return ok([]);
    return ok(results.slice(0, Math.max(1, query.maxResults)).map(toSourceDocument));
  }

  async fetch(id: string): Promise<Result<SourceDocument, Error>> {
    const result = await this.getJson(`${this.baseUrl}/api/rest/v4/clusters/${encodeURIComponent(id)}/`);
    if (!result.ok) return err(result.error);
    return ok(toSourceDocument(result.value as CourtListenerResult));
  }

  /** Perform a GET with timeout and JSON parsing, normalising failures to Error. */
  private async getJson(url: string): Promise<Result<unknown, Error>> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const headers: Record<string, string> = {
        Accept: "application/json",
        "User-Agent": "veritas-verifiers-legal",
      };
      if (this.apiToken) headers["Authorization"] = `Token ${this.apiToken}`;
      const response = await this.fetchImpl(url, { headers, signal: controller.signal });
      if (!response.ok) return err(new Error(`CourtListener request failed: HTTP ${response.status}`));
      const json: unknown = await response.json();
      return ok(json);
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    } finally {
      clearTimeout(timer);
    }
  }
}

/** Factory returning the real CourtListener case-law source. */
export function createCourtListenerCaseLawSource(
  options: CourtListenerSourceOptions = {},
): CaseLawSourcePort {
  return new CourtListenerCaseLawSource(options);
}
