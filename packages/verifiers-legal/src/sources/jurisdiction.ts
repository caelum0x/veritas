// Jurisdiction data source port + mock: query legal system profiles and court hierarchy information.

import { ok } from "@veritas/core";
import {
  type DataSourcePort,
  type SourceDocument,
  type SourceQuery,
  MockDataSource,
} from "@veritas/verifier-kit";

/** Legal system classification. */
export type LegalSystem = "common-law" | "civil-law" | "mixed" | "religious" | "customary";

/** Extended metadata on a jurisdiction source document. */
export interface JurisdictionMetadata {
  readonly jurisdictionCode: string;
  readonly jurisdictionName: string;
  readonly legalSystem: LegalSystem;
  readonly country: string;
  readonly subdivisionType?: string;
  readonly courtHierarchy: readonly string[];
  readonly primaryLanguage: string;
  readonly treatyMemberships: readonly string[];
}

/** Jurisdiction-specific query parameters. */
export interface JurisdictionQuery extends SourceQuery {
  readonly legalSystem?: LegalSystem;
  readonly country?: string;
}

/** Port interface for querying a jurisdiction profile database. */
export interface JurisdictionSourcePort extends DataSourcePort {
  /** Look up a jurisdiction profile by its ISO or custom code. */
  fetchByCode(code: string): Promise<import("@veritas/core").Result<SourceDocument, Error>>;
  /** Search jurisdiction profiles with optional filters. */
  searchJurisdictions(query: JurisdictionQuery): Promise<import("@veritas/core").Result<readonly SourceDocument[], Error>>;
}

/** Seed entries for the mock jurisdiction source. */
const MOCK_JURISDICTIONS: ReadonlyArray<{
  id: string;
  url: string;
  title: string;
  snippet: string;
  publishedAt: string | null;
  metadata: JurisdictionMetadata;
  tags: readonly string[];
}> = [
  {
    id: "US-Federal",
    url: "https://www.uscourts.gov/about-federal-courts/court-role-and-structure",
    title: "United States Federal Jurisdiction",
    snippet:
      "The federal court system has three main levels: district courts, circuit courts of appeals, and the Supreme Court. Federal law governs matters including constitutional questions, federal statutes, and disputes between states.",
    publishedAt: "1789-09-24",
    metadata: {
      jurisdictionCode: "US-Federal",
      jurisdictionName: "United States Federal",
      legalSystem: "common-law",
      country: "US",
      courtHierarchy: [
        "U.S. Supreme Court",
        "U.S. Courts of Appeals (Circuit Courts)",
        "U.S. District Courts",
        "U.S. Bankruptcy Courts",
      ],
      primaryLanguage: "en",
      treatyMemberships: ["NAFTA/USMCA", "WTO", "ICSID"],
    },
    tags: ["federal", "united states", "common law", "supreme court", "district court", "circuit"],
  },
  {
    id: "US-CA",
    url: "https://www.courts.ca.gov/2113.htm",
    title: "California State Jurisdiction",
    snippet:
      "California's court system consists of the Supreme Court, Courts of Appeal, and Superior Courts. California follows common law with significant statutory modifications including the California Codes.",
    publishedAt: "1850-09-09",
    metadata: {
      jurisdictionCode: "US-CA",
      jurisdictionName: "California",
      legalSystem: "common-law",
      country: "US",
      subdivisionType: "state",
      courtHierarchy: [
        "California Supreme Court",
        "California Courts of Appeal (6 Districts)",
        "California Superior Courts",
      ],
      primaryLanguage: "en",
      treatyMemberships: [],
    },
    tags: ["california", "state", "united states", "common law", "superior court", "ccpa"],
  },
  {
    id: "EU",
    url: "https://europa.eu/european-union/law_en",
    title: "European Union Legal Order",
    snippet:
      "EU law is a unique supranational legal order that takes precedence over the national laws of member states. The Court of Justice of the EU and the General Court form the judicial branch of the EU institutions.",
    publishedAt: "1993-11-01",
    metadata: {
      jurisdictionCode: "EU",
      jurisdictionName: "European Union",
      legalSystem: "civil-law",
      country: "EU",
      courtHierarchy: [
        "Court of Justice of the European Union (CJEU)",
        "General Court",
        "Specialized Courts",
      ],
      primaryLanguage: "multi",
      treatyMemberships: ["WTO", "ECHR", "Treaty on European Union", "Treaty on the Functioning of the EU"],
    },
    tags: ["eu", "european union", "civil law", "gdpr", "cjeu", "supranational"],
  },
  {
    id: "GB",
    url: "https://www.judiciary.uk/about-the-judiciary/the-justice-system/",
    title: "England and Wales Jurisdiction",
    snippet:
      "England and Wales operate under a common law system with the Supreme Court of the United Kingdom at the apex. The legal system is characterised by case law, parliamentary sovereignty, and an independent judiciary.",
    publishedAt: "1066-01-01",
    metadata: {
      jurisdictionCode: "GB",
      jurisdictionName: "England and Wales",
      legalSystem: "common-law",
      country: "GB",
      courtHierarchy: [
        "UK Supreme Court",
        "Court of Appeal",
        "High Court of Justice",
        "Crown Court",
        "County Courts",
        "Magistrates' Courts",
      ],
      primaryLanguage: "en",
      treatyMemberships: ["ECHR", "WTO", "UK-EU Trade and Cooperation Agreement"],
    },
    tags: ["england", "wales", "uk", "common law", "supreme court", "high court", "british"],
  },
  {
    id: "DE",
    url: "https://www.bundesverfassungsgericht.de/EN/Homepage/homepage_node.html",
    title: "Germany (Federal Republic) Jurisdiction",
    snippet:
      "Germany operates a civil law system rooted in the German Civil Code (BGB). The Federal Constitutional Court (Bundesverfassungsgericht) is the supreme authority on constitutional questions, while the Federal Court of Justice handles civil and criminal matters.",
    publishedAt: "1949-05-23",
    metadata: {
      jurisdictionCode: "DE",
      jurisdictionName: "Federal Republic of Germany",
      legalSystem: "civil-law",
      country: "DE",
      courtHierarchy: [
        "Federal Constitutional Court (Bundesverfassungsgericht)",
        "Federal Court of Justice (Bundesgerichtshof)",
        "Federal Administrative Court (Bundesverwaltungsgericht)",
        "Higher Regional Courts (Oberlandesgericht)",
        "Regional Courts (Landgericht)",
        "Local Courts (Amtsgericht)",
      ],
      primaryLanguage: "de",
      treatyMemberships: ["EU", "ECHR", "WTO", "NATO"],
    },
    tags: ["germany", "german", "civil law", "bgb", "bundesverfassungsgericht", "eu member"],
  },
  {
    id: "SG",
    url: "https://www.supremecourt.gov.sg/about-us/the-judiciary",
    title: "Singapore Jurisdiction",
    snippet:
      "Singapore has a hybrid legal system combining common law heritage from British colonialism with statutory modifications. The Supreme Court comprises the Court of Appeal and the High Court.",
    publishedAt: "1965-08-09",
    metadata: {
      jurisdictionCode: "SG",
      jurisdictionName: "Republic of Singapore",
      legalSystem: "mixed",
      country: "SG",
      courtHierarchy: [
        "Court of Appeal",
        "Appellate Division of the High Court",
        "High Court",
        "State Courts",
      ],
      primaryLanguage: "en",
      treatyMemberships: ["WTO", "CPTPP", "RCEP", "ICSID"],
    },
    tags: ["singapore", "mixed law", "common law", "court of appeal", "high court", "asia"],
  },
];

/** In-memory jurisdiction source backed by MockDataSource. */
export class MockJurisdictionSource implements JurisdictionSourcePort {
  readonly sourceId = "jurisdiction-mock";
  readonly displayName = "Mock Jurisdiction Database";

  private readonly inner: MockDataSource;
  private readonly byCode: ReadonlyMap<string, SourceDocument>;

  constructor() {
    const entries = MOCK_JURISDICTIONS.map((j) => ({
      id: j.id,
      url: j.url,
      title: j.title,
      snippet: j.snippet,
      publishedAt: j.publishedAt,
      metadata: j.metadata as unknown as Record<string, unknown>,
      tags: j.tags,
    }));

    this.inner = new MockDataSource(this.sourceId, this.displayName, entries);

    this.byCode = new Map(
      MOCK_JURISDICTIONS.map((j) => [
        j.metadata.jurisdictionCode,
        {
          id: j.id,
          url: j.url,
          title: j.title,
          snippet: j.snippet,
          publishedAt: j.publishedAt,
          metadata: j.metadata as unknown as Record<string, unknown>,
        },
      ])
    );
  }

  async search(query: SourceQuery) {
    return this.inner.search(query);
  }

  async fetch(id: string) {
    return this.inner.fetch(id);
  }

  async fetchByCode(code: string) {
    const doc = this.byCode.get(code);
    if (!doc) {
      return { ok: false, error: new Error(`MockJurisdictionSource: unknown jurisdiction code: ${code}`) } as import("@veritas/core").Result<SourceDocument, Error>;
    }
    return ok(doc);
  }

  async searchJurisdictions(query: JurisdictionQuery) {
    const baseResult = await this.inner.search(query);
    if (!baseResult.ok) return baseResult;

    const filtered = baseResult.value.filter((doc) => {
      const meta = doc.metadata as Partial<JurisdictionMetadata>;
      if (query.legalSystem && meta.legalSystem !== query.legalSystem) return false;
      if (query.country && meta.country !== query.country) return false;
      return true;
    });

    return ok(filtered as readonly SourceDocument[]);
  }
}

/** Factory: create the default mock jurisdiction source for offline use. */
export function createMockJurisdictionSource(): JurisdictionSourcePort {
  return new MockJurisdictionSource();
}
