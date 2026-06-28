// Statute data source port + mock: query statutory law by jurisdiction and keyword.

import { ok, err } from "@veritas/core";
import {
  type DataSourcePort,
  type SourceDocument,
  type SourceQuery,
  MockDataSource,
} from "@veritas/verifier-kit";

/** Extended metadata on a statute source document. */
export interface StatuteMetadata {
  readonly jurisdiction: string;
  readonly code: string;
  readonly section: string;
  readonly title: string;
  readonly effectiveDate: string | null;
  readonly repealedDate: string | null;
  readonly citationString: string;
}

/** Statute-specific query parameters extending the base SourceQuery. */
export interface StatuteQuery extends SourceQuery {
  readonly jurisdiction?: string;
  readonly code?: string;
}

/** Port interface for querying a statutory law database. */
export interface StatuteSourcePort extends DataSourcePort {
  /** Search statutes with optional jurisdiction and code filters. */
  searchStatutes(query: StatuteQuery): Promise<import("@veritas/core").Result<readonly SourceDocument[], Error>>;
}

/** Seed entries for the mock statute source. */
const MOCK_STATUTES: ReadonlyArray<{
  id: string;
  url: string;
  title: string;
  snippet: string;
  publishedAt: string | null;
  metadata: StatuteMetadata;
  tags: readonly string[];
}> = [
  {
    id: "us-sec-10b",
    url: "https://www.law.cornell.edu/uscode/text/15/78j",
    title: "Securities Exchange Act § 10(b) – Manipulative and Deceptive Devices",
    snippet:
      "It shall be unlawful for any person, directly or indirectly, by the use of any means or instrumentality of interstate commerce or of the mails, to use or employ, in connection with the purchase or sale of any security, any manipulative or deceptive device.",
    publishedAt: "1934-06-06",
    metadata: {
      jurisdiction: "US-Federal",
      code: "15 U.S.C.",
      section: "§ 78j",
      title: "Securities Exchange Act § 10(b)",
      effectiveDate: "1934-06-06T00:00:00Z" as import("@veritas/core").IsoTimestamp,
      repealedDate: null,
      citationString: "15 U.S.C. § 78j (1934)",
    },
    tags: ["securities", "fraud", "deceptive", "manipulative", "federal", "exchange act"],
  },
  {
    id: "us-gdpr-equivalent-ccpa",
    url: "https://oag.ca.gov/privacy/ccpa",
    title: "California Consumer Privacy Act (CCPA) – Cal. Civ. Code § 1798.100",
    snippet:
      "A consumer shall have the right to request that a business disclose the categories and specific pieces of personal information the business has collected about the consumer.",
    publishedAt: "2018-06-28",
    metadata: {
      jurisdiction: "US-CA",
      code: "Cal. Civ. Code",
      section: "§ 1798.100",
      title: "California Consumer Privacy Act",
      effectiveDate: "2020-01-01T00:00:00Z" as import("@veritas/core").IsoTimestamp,
      repealedDate: null,
      citationString: "Cal. Civ. Code § 1798.100 (2018)",
    },
    tags: ["privacy", "consumer", "california", "data", "ccpa", "personal information"],
  },
  {
    id: "eu-gdpr-art17",
    url: "https://gdpr-info.eu/art-17-gdpr/",
    title: "GDPR Article 17 – Right to Erasure ('Right to be Forgotten')",
    snippet:
      "The data subject shall have the right to obtain from the controller the erasure of personal data concerning him or her without undue delay.",
    publishedAt: "2016-04-27",
    metadata: {
      jurisdiction: "EU",
      code: "GDPR",
      section: "Art. 17",
      title: "Right to erasure ('right to be forgotten')",
      effectiveDate: "2018-05-25T00:00:00Z" as import("@veritas/core").IsoTimestamp,
      repealedDate: null,
      citationString: "GDPR Art. 17 (2016/679)",
    },
    tags: ["gdpr", "privacy", "erasure", "right to be forgotten", "eu", "data protection"],
  },
  {
    id: "us-antitrust-sherman-act-1",
    url: "https://www.law.cornell.edu/uscode/text/15/1",
    title: "Sherman Antitrust Act § 1 – Trusts, etc., in Restraint of Trade",
    snippet:
      "Every contract, combination in the form of trust or otherwise, or conspiracy, in restraint of trade or commerce among the several States, or with foreign nations, is declared to be illegal.",
    publishedAt: "1890-07-02",
    metadata: {
      jurisdiction: "US-Federal",
      code: "15 U.S.C.",
      section: "§ 1",
      title: "Sherman Antitrust Act § 1",
      effectiveDate: "1890-07-02T00:00:00Z" as import("@veritas/core").IsoTimestamp,
      repealedDate: null,
      citationString: "15 U.S.C. § 1 (1890)",
    },
    tags: ["antitrust", "sherman", "restraint of trade", "monopoly", "federal", "competition"],
  },
  {
    id: "us-copyright-act-106",
    url: "https://www.law.cornell.edu/uscode/text/17/106",
    title: "Copyright Act § 106 – Exclusive Rights in Copyrighted Works",
    snippet:
      "The owner of copyright under this title has the exclusive rights to reproduce the copyrighted work, prepare derivative works, and distribute copies.",
    publishedAt: "1976-10-19",
    metadata: {
      jurisdiction: "US-Federal",
      code: "17 U.S.C.",
      section: "§ 106",
      title: "Exclusive Rights in Copyrighted Works",
      effectiveDate: "1978-01-01T00:00:00Z" as import("@veritas/core").IsoTimestamp,
      repealedDate: null,
      citationString: "17 U.S.C. § 106 (1976)",
    },
    tags: ["copyright", "intellectual property", "exclusive rights", "reproduction", "federal"],
  },
];

/** In-memory statute source backed by MockDataSource with legal-domain search. */
export class MockStatuteSource implements StatuteSourcePort {
  readonly sourceId = "statute-mock";
  readonly displayName = "Mock Statute Database";

  private readonly inner: MockDataSource;

  constructor() {
    this.inner = new MockDataSource(
      this.sourceId,
      this.displayName,
      MOCK_STATUTES.map((s) => ({
        id: s.id,
        url: s.url,
        title: s.title,
        snippet: s.snippet,
        publishedAt: s.publishedAt,
        metadata: s.metadata as unknown as Record<string, unknown>,
        tags: s.tags,
      }))
    );
  }

  async search(query: SourceQuery) {
    return this.inner.search(query);
  }

  async fetch(id: string) {
    return this.inner.fetch(id);
  }

  async searchStatutes(query: StatuteQuery) {
    const baseResult = await this.inner.search(query);
    if (!baseResult.ok) return baseResult;

    const filtered = baseResult.value.filter((doc) => {
      const meta = doc.metadata as Partial<StatuteMetadata>;
      if (query.jurisdiction && meta.jurisdiction !== query.jurisdiction) return false;
      if (query.code && meta.code !== query.code) return false;
      return true;
    });

    return ok(filtered as readonly SourceDocument[]);
  }
}

/** Factory: create the default mock statute source for offline use. */
export function createMockStatuteSource(): StatuteSourcePort {
  return new MockStatuteSource();
}
