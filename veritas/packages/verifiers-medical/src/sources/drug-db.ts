// DrugDb port: abstract interface and mock for drug database queries (e.g. FDA NDC, RxNorm).

import { ok, err, type Result } from "@veritas/core";
import { type DataSourcePort, type SourceDocument, type SourceQuery } from "@veritas/verifier-kit";

/** A drug record from a drug database source. */
export interface DrugRecord {
  readonly ndc: string;
  readonly brandName: string;
  readonly genericName: string;
  readonly manufacturer: string;
  readonly dosageForm: string;
  readonly route: string;
  readonly approvalStatus: "approved" | "withdrawn" | "investigational" | "unknown";
  readonly approvedDate: string | null;
  readonly labelUrl: string;
  readonly interactions: readonly string[];
  readonly contraindications: readonly string[];
}

/** Port interface for querying a drug database. */
export interface DrugDbPort extends DataSourcePort {
  /** Look up a drug by name (brand or generic). */
  lookupByName(name: string): Promise<Result<readonly DrugRecord[], Error>>;
  /** Look up a drug by NDC code. */
  lookupByNdc(ndc: string): Promise<Result<DrugRecord, Error>>;
}

/** In-memory mock DrugDb for development and testing. */
export class MockDrugDb implements DrugDbPort {
  readonly sourceId = "drug-db";
  readonly displayName = "Drug Database (Mock)";

  private readonly records: ReadonlyMap<string, DrugRecord>;

  constructor(seed: readonly DrugRecord[] = MOCK_DRUG_SEED) {
    this.records = new Map(seed.map((r) => [r.ndc, r]));
  }

  async lookupByName(name: string): Promise<Result<readonly DrugRecord[], Error>> {
    const lower = name.toLowerCase();
    const matches = [...this.records.values()].filter(
      (r) =>
        r.brandName.toLowerCase().includes(lower) ||
        r.genericName.toLowerCase().includes(lower),
    );
    return ok(matches);
  }

  async lookupByNdc(ndc: string): Promise<Result<DrugRecord, Error>> {
    const record = this.records.get(ndc);
    if (!record) {
      return err(new Error(`DrugDb: NDC not found: ${ndc}`));
    }
    return ok(record);
  }

  async search(query: SourceQuery): Promise<Result<readonly SourceDocument[], Error>> {
    const lower = query.keywords.map((k) => k.toLowerCase());
    const matches = [...this.records.values()]
      .filter((r) =>
        lower.some(
          (kw) =>
            r.brandName.toLowerCase().includes(kw) ||
            r.genericName.toLowerCase().includes(kw),
        ),
      )
      .slice(0, query.maxResults)
      .map((r): SourceDocument => ({
        id: r.ndc,
        url: r.labelUrl,
        title: `${r.brandName} (${r.genericName})`,
        snippet: `Dosage form: ${r.dosageForm}. Route: ${r.route}. Status: ${r.approvalStatus}.`,
        publishedAt: r.approvedDate,
        metadata: {
          ndc: r.ndc,
          manufacturer: r.manufacturer,
          approvalStatus: r.approvalStatus,
          interactions: r.interactions,
          contraindications: r.contraindications,
        },
      }));
    return ok(matches);
  }

  async fetch(id: string): Promise<Result<SourceDocument, Error>> {
    const result = await this.lookupByNdc(id);
    if (!result.ok) return result;
    const r = result.value;
    return ok({
      id: r.ndc,
      url: r.labelUrl,
      title: `${r.brandName} (${r.genericName})`,
      snippet: `Dosage form: ${r.dosageForm}. Route: ${r.route}. Status: ${r.approvalStatus}.`,
      publishedAt: r.approvedDate,
      metadata: {
        ndc: r.ndc,
        manufacturer: r.manufacturer,
        approvalStatus: r.approvalStatus,
        interactions: r.interactions,
        contraindications: r.contraindications,
      },
    });
  }
}

const MOCK_DRUG_SEED: readonly DrugRecord[] = [
  {
    ndc: "0069-0150-68",
    brandName: "Lipitor",
    genericName: "atorvastatin calcium",
    manufacturer: "Pfizer Inc.",
    dosageForm: "tablet",
    route: "oral",
    approvalStatus: "approved",
    approvedDate: "1996-12-17",
    labelUrl: "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=lipitor",
    interactions: ["cyclosporine", "clarithromycin", "itraconazole"],
    contraindications: ["active liver disease", "pregnancy", "breastfeeding"],
  },
  {
    ndc: "0006-0963-54",
    brandName: "Januvia",
    genericName: "sitagliptin",
    manufacturer: "Merck Sharp & Dohme Corp.",
    dosageForm: "tablet",
    route: "oral",
    approvalStatus: "approved",
    approvedDate: "2006-10-16",
    labelUrl: "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=januvia",
    interactions: ["digoxin"],
    contraindications: ["type 1 diabetes", "diabetic ketoacidosis"],
  },
  {
    ndc: "0078-0341-15",
    brandName: "Gleevec",
    genericName: "imatinib mesylate",
    manufacturer: "Novartis Pharmaceuticals",
    dosageForm: "tablet",
    route: "oral",
    approvalStatus: "approved",
    approvedDate: "2001-05-10",
    labelUrl: "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=gleevec",
    interactions: ["warfarin", "ketoconazole", "rifampicin"],
    contraindications: ["pregnancy"],
  },
  {
    ndc: "0002-7399-01",
    brandName: "Trulicity",
    genericName: "dulaglutide",
    manufacturer: "Eli Lilly and Company",
    dosageForm: "injection",
    route: "subcutaneous",
    approvalStatus: "approved",
    approvedDate: "2014-09-18",
    labelUrl: "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=trulicity",
    interactions: ["insulin", "sulfonylureas"],
    contraindications: ["personal or family history of MTC", "MEN 2", "pregnancy"],
  },
];

/** Factory for the mock DrugDb port. */
export function createMockDrugDb(seed?: readonly DrugRecord[]): DrugDbPort {
  return new MockDrugDb(seed);
}
