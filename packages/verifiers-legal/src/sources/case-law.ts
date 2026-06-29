// CaseLaw data source port + mock: query judicial decisions by court, jurisdiction, and keyword.

import { ok } from "@veritas/core";
import {
  type DataSourcePort,
  type SourceDocument,
  type SourceQuery,
  MockDataSource,
} from "@veritas/verifier-kit";

/** Extended metadata on a case-law source document. */
export interface CaseLawMetadata {
  readonly court: string;
  readonly jurisdiction: string;
  readonly docketNumber: string;
  readonly decisionDate: string | null;
  readonly citation: string;
  readonly parties: string;
  readonly precedentialStatus: "binding" | "persuasive" | "non-precedential";
}

/** Case-law-specific query parameters extending the base SourceQuery. */
export interface CaseLawQuery extends SourceQuery {
  readonly jurisdiction?: string;
  readonly court?: string;
  readonly precedentialStatus?: CaseLawMetadata["precedentialStatus"];
}

/** Port interface for querying a judicial case-law database. */
export interface CaseLawSourcePort extends DataSourcePort {
  /** Search cases with optional jurisdiction, court, and status filters. */
  searchCases(query: CaseLawQuery): Promise<import("@veritas/core").Result<readonly SourceDocument[], Error>>;
}

/** Seed entries for the mock case-law source. */
const MOCK_CASES: ReadonlyArray<{
  id: string;
  url: string;
  title: string;
  snippet: string;
  publishedAt: string | null;
  metadata: CaseLawMetadata;
  tags: readonly string[];
}> = [
  {
    id: "scotus-citizens-united",
    url: "https://www.supremecourt.gov/opinions/09pdf/08-205.pdf",
    title: "Citizens United v. Federal Election Commission, 558 U.S. 310 (2010)",
    snippet:
      "Political speech does not lose First Amendment protection simply because its source is a corporation rather than an individual. The First Amendment's protections extend to corporations.",
    publishedAt: "2010-01-21",
    metadata: {
      court: "U.S. Supreme Court",
      jurisdiction: "US-Federal",
      docketNumber: "08-205",
      decisionDate: "2010-01-21T00:00:00Z" as import("@veritas/core").IsoTimestamp,
      citation: "558 U.S. 310 (2010)",
      parties: "Citizens United v. Federal Election Commission",
      precedentialStatus: "binding",
    },
    tags: ["first amendment", "campaign finance", "corporation", "speech", "election", "federal"],
  },
  {
    id: "scotus-miranda",
    url: "https://supreme.justia.com/cases/federal/us/384/436/",
    title: "Miranda v. Arizona, 384 U.S. 436 (1966)",
    snippet:
      "Prior to any questioning, the person must be warned that he has a right to remain silent, that any statement he does make may be used as evidence against him, and that he has a right to the presence of an attorney.",
    publishedAt: "1966-06-13",
    metadata: {
      court: "U.S. Supreme Court",
      jurisdiction: "US-Federal",
      docketNumber: "759",
      decisionDate: "1966-06-13T00:00:00Z" as import("@veritas/core").IsoTimestamp,
      citation: "384 U.S. 436 (1966)",
      parties: "Miranda v. Arizona",
      precedentialStatus: "binding",
    },
    tags: ["miranda rights", "fifth amendment", "self-incrimination", "custody", "interrogation", "criminal"],
  },
  {
    id: "scotus-brown-v-board",
    url: "https://supreme.justia.com/cases/federal/us/347/483/",
    title: "Brown v. Board of Education, 347 U.S. 483 (1954)",
    snippet:
      "Separate educational facilities are inherently unequal. Therefore, the plaintiffs and others similarly situated for whom the actions have been brought are, by reason of the segregation complained of, deprived of the equal protection of the laws guaranteed by the Fourteenth Amendment.",
    publishedAt: "1954-05-17",
    metadata: {
      court: "U.S. Supreme Court",
      jurisdiction: "US-Federal",
      docketNumber: "1",
      decisionDate: "1954-05-17T00:00:00Z" as import("@veritas/core").IsoTimestamp,
      citation: "347 U.S. 483 (1954)",
      parties: "Brown v. Board of Education of Topeka",
      precedentialStatus: "binding",
    },
    tags: ["equal protection", "segregation", "education", "fourteenth amendment", "civil rights", "desegregation"],
  },
  {
    id: "ca9-oracle-v-google",
    url: "https://caselaw.findlaw.com/us-9th-circuit/1729550.html",
    title: "Oracle America, Inc. v. Google LLC, 9th Cir. (2018)",
    snippet:
      "Google's copying of the Java SE API, which included creative expression in the form of creative package, class, and method names, constituted copyright infringement as a matter of law.",
    publishedAt: "2018-03-27",
    metadata: {
      court: "U.S. Court of Appeals for the Ninth Circuit",
      jurisdiction: "US-Federal",
      docketNumber: "17-1118",
      decisionDate: "2018-03-27T00:00:00Z" as import("@veritas/core").IsoTimestamp,
      citation: "886 F.3d 1179 (9th Cir. 2018)",
      parties: "Oracle America, Inc. v. Google LLC",
      precedentialStatus: "binding",
    },
    tags: ["copyright", "api", "software", "java", "fair use", "ninth circuit", "intellectual property"],
  },
  {
    id: "ecj-schrems-ii",
    url: "https://curia.europa.eu/juris/document/document.jsf?docid=228677",
    title: "Data Protection Commissioner v. Facebook Ireland Ltd (Schrems II), C-311/18 (2020)",
    snippet:
      "The Privacy Shield Decision is invalid. Standard contractual clauses for the transfer of personal data to third countries must be interpreted to mean that transfers of such data must be suspended or prohibited where the law of the third country does not ensure adequate protection.",
    publishedAt: "2020-07-16",
    metadata: {
      court: "Court of Justice of the European Union",
      jurisdiction: "EU",
      docketNumber: "C-311/18",
      decisionDate: "2020-07-16T00:00:00Z" as import("@veritas/core").IsoTimestamp,
      citation: "C-311/18 ECLI:EU:C:2020:559",
      parties: "Data Protection Commissioner v. Facebook Ireland Limited and Maximillian Schrems",
      precedentialStatus: "binding",
    },
    tags: ["gdpr", "data transfer", "privacy shield", "schrems", "eu", "adequacy", "personal data"],
  },
];

/** In-memory case-law source backed by MockDataSource. */
export class MockCaseLawSource implements CaseLawSourcePort {
  readonly sourceId = "case-law-mock";
  readonly displayName = "Mock Case Law Database";

  private readonly inner: MockDataSource;

  constructor() {
    this.inner = new MockDataSource(
      this.sourceId,
      this.displayName,
      MOCK_CASES.map((c) => ({
        id: c.id,
        url: c.url,
        title: c.title,
        snippet: c.snippet,
        publishedAt: c.publishedAt,
        metadata: c.metadata as unknown as Record<string, unknown>,
        tags: c.tags,
      }))
    );
  }

  async search(query: SourceQuery) {
    return this.inner.search(query);
  }

  async fetch(id: string) {
    return this.inner.fetch(id);
  }

  async searchCases(query: CaseLawQuery) {
    const baseResult = await this.inner.search(query);
    if (!baseResult.ok) return baseResult;

    const filtered = baseResult.value.filter((doc) => {
      const meta = doc.metadata as Partial<CaseLawMetadata>;
      if (query.jurisdiction && meta.jurisdiction !== query.jurisdiction) return false;
      if (query.court && meta.court !== query.court) return false;
      if (query.precedentialStatus && meta.precedentialStatus !== query.precedentialStatus) return false;
      return true;
    });

    return ok(filtered as readonly SourceDocument[]);
  }
}

/** Factory: create the default mock case-law source for offline use. */
export function createMockCaseLawSource(): CaseLawSourcePort {
  return new MockCaseLawSource();
}
