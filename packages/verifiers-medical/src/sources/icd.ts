// Icd port: abstract interface and mock for ICD-10/ICD-11 diagnosis code lookups.

import { ok, err, type Result } from "@veritas/core";
import { type DataSourcePort, type SourceDocument, type SourceQuery } from "@veritas/verifier-kit";

/** A single ICD diagnosis code entry. */
export interface IcdCodeEntry {
  readonly code: string;
  readonly version: "ICD-10" | "ICD-11";
  readonly description: string;
  readonly category: string;
  readonly block: string;
  readonly chapter: string;
  readonly inclusionTerms: readonly string[];
  readonly excludes1: readonly string[];
  readonly excludes2: readonly string[];
  readonly url: string;
}

/** Port interface for querying ICD diagnosis codes. */
export interface IcdPort extends DataSourcePort {
  /** Look up a specific ICD code (e.g. "E11.9"). */
  lookupCode(code: string): Promise<Result<IcdCodeEntry, Error>>;
  /** Search ICD codes by description keyword. */
  searchByDescription(keyword: string, maxResults?: number): Promise<Result<readonly IcdCodeEntry[], Error>>;
}

/** In-memory mock IcdPort for development and testing. */
export class MockIcdSource implements IcdPort {
  readonly sourceId = "icd-codes";
  readonly displayName = "ICD Diagnosis Codes (Mock)";

  private readonly byCode: ReadonlyMap<string, IcdCodeEntry>;
  private readonly entries: readonly IcdCodeEntry[];

  constructor(seed: readonly IcdCodeEntry[] = MOCK_ICD_SEED) {
    this.byCode = new Map(seed.map((e) => [e.code.toUpperCase(), e]));
    this.entries = seed;
  }

  async lookupCode(code: string): Promise<Result<IcdCodeEntry, Error>> {
    const entry = this.byCode.get(code.toUpperCase());
    if (!entry) {
      return err(new Error(`ICD: code not found: ${code}`));
    }
    return ok(entry);
  }

  async searchByDescription(
    keyword: string,
    maxResults = 10,
  ): Promise<Result<readonly IcdCodeEntry[], Error>> {
    const lower = keyword.toLowerCase();
    const matches = this.entries
      .filter(
        (e) =>
          e.description.toLowerCase().includes(lower) ||
          e.category.toLowerCase().includes(lower) ||
          e.inclusionTerms.some((t) => t.toLowerCase().includes(lower)),
      )
      .slice(0, maxResults);
    return ok(matches);
  }

  async search(query: SourceQuery): Promise<Result<readonly SourceDocument[], Error>> {
    const lower = query.keywords.map((k) => k.toLowerCase());
    const matches = this.entries
      .filter((e) =>
        lower.some(
          (kw) =>
            e.description.toLowerCase().includes(kw) ||
            e.code.toLowerCase().includes(kw) ||
            e.category.toLowerCase().includes(kw),
        ),
      )
      .slice(0, query.maxResults)
      .map((e): SourceDocument => ({
        id: e.code,
        url: e.url,
        title: `${e.code}: ${e.description}`,
        snippet: `${e.version} | Chapter: ${e.chapter} | Category: ${e.category}`,
        publishedAt: null,
        metadata: {
          version: e.version,
          block: e.block,
          chapter: e.chapter,
          inclusionTerms: e.inclusionTerms,
        },
      }));
    return ok(matches);
  }

  async fetch(id: string): Promise<Result<SourceDocument, Error>> {
    const result = await this.lookupCode(id);
    if (!result.ok) return result;
    const e = result.value;
    return ok({
      id: e.code,
      url: e.url,
      title: `${e.code}: ${e.description}`,
      snippet: `${e.version} | Chapter: ${e.chapter} | Category: ${e.category}`,
      publishedAt: null,
      metadata: {
        version: e.version,
        block: e.block,
        chapter: e.chapter,
        inclusionTerms: e.inclusionTerms,
      },
    });
  }
}

const MOCK_ICD_SEED: readonly IcdCodeEntry[] = [
  {
    code: "E11.9",
    version: "ICD-10",
    description: "Type 2 diabetes mellitus without complications",
    category: "Type 2 diabetes mellitus",
    block: "Diabetes mellitus (E08-E13)",
    chapter: "Endocrine, nutritional and metabolic diseases (E00-E89)",
    inclusionTerms: ["Adult-onset diabetes mellitus", "Noninsulin-dependent diabetes mellitus"],
    excludes1: ["diabetes mellitus due to underlying condition (E08.-)"],
    excludes2: ["gestational diabetes (O24.-)"],
    url: "https://www.icd10data.com/ICD10CM/Codes/E00-E89/E08-E13/E11-/E11.9",
  },
  {
    code: "I10",
    version: "ICD-10",
    description: "Essential (primary) hypertension",
    category: "Hypertensive diseases",
    block: "Hypertensive diseases (I10-I16)",
    chapter: "Diseases of the circulatory system (I00-I99)",
    inclusionTerms: ["High blood pressure", "Hypertension NOS"],
    excludes1: ["hypertensive disease complicating pregnancy (O10-O11)"],
    excludes2: ["neonatal hypertension (P29.2)"],
    url: "https://www.icd10data.com/ICD10CM/Codes/I00-I99/I10-I16/I10-/I10",
  },
  {
    code: "J45.909",
    version: "ICD-10",
    description: "Unspecified asthma, uncomplicated",
    category: "Asthma",
    block: "Chronic lower respiratory diseases (J40-J47)",
    chapter: "Diseases of the respiratory system (J00-J99)",
    inclusionTerms: ["Asthma NOS"],
    excludes1: ["detergent asthma (J68.0)"],
    excludes2: ["eosinophilic asthma (J82.83)"],
    url: "https://www.icd10data.com/ICD10CM/Codes/J00-J99/J40-J47/J45-/J45.909",
  },
  {
    code: "C50.919",
    version: "ICD-10",
    description: "Malignant neoplasm of unspecified site of unspecified female breast",
    category: "Malignant neoplasm of breast",
    block: "Malignant neoplasms of breast (C50)",
    chapter: "Neoplasms (C00-D49)",
    inclusionTerms: ["Breast cancer NOS"],
    excludes1: ["skin of breast (C44.501-)"],
    excludes2: [],
    url: "https://www.icd10data.com/ICD10CM/Codes/C00-D49/C50-C50/C50-/C50.919",
  },
  {
    code: "F32.9",
    version: "ICD-10",
    description: "Major depressive disorder, single episode, unspecified",
    category: "Depressive episodes",
    block: "Mood [affective] disorders (F30-F39)",
    chapter: "Mental, Behavioral and Neurodevelopmental disorders (F01-F99)",
    inclusionTerms: ["Depression NOS", "Depressive disorder NOS"],
    excludes1: ["bipolar disorder (F31.-)"],
    excludes2: ["adjustment disorder with depressed mood (F43.21)"],
    url: "https://www.icd10data.com/ICD10CM/Codes/F01-F99/F30-F39/F32-/F32.9",
  },
];

/** Factory for the mock ICD port. */
export function createMockIcdSource(seed?: readonly IcdCodeEntry[]): IcdPort {
  return new MockIcdSource(seed);
}
