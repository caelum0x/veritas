// Guidelines port: abstract interface and mock for clinical practice guideline sources (e.g. USPSTF, AHA, ACC).

import { ok, err, type Result } from "@veritas/core";
import { type DataSourcePort, type SourceDocument, type SourceQuery } from "@veritas/verifier-kit";

/** Strength of a clinical recommendation per evidence-grading conventions. */
export type RecommendationStrength = "A" | "B" | "C" | "D" | "I";

/** A clinical practice guideline recommendation entry. */
export interface GuidelineEntry {
  readonly id: string;
  readonly title: string;
  readonly organization: string;
  readonly topic: string;
  readonly condition: string;
  readonly recommendation: string;
  readonly strength: RecommendationStrength;
  readonly evidenceQuality: "high" | "moderate" | "low" | "very_low";
  readonly year: number;
  readonly url: string;
  readonly tags: readonly string[];
}

/** Port interface for querying clinical practice guidelines. */
export interface GuidelinesPort extends DataSourcePort {
  /** Search guidelines by condition or topic keyword. */
  searchByCondition(condition: string, maxResults?: number): Promise<Result<readonly GuidelineEntry[], Error>>;
  /** Retrieve a specific guideline by its stable ID. */
  getById(id: string): Promise<Result<GuidelineEntry, Error>>;
}

/** In-memory mock GuidelinesPort for development and testing. */
export class MockGuidelinesSource implements GuidelinesPort {
  readonly sourceId = "clinical-guidelines";
  readonly displayName = "Clinical Practice Guidelines (Mock)";

  private readonly index: ReadonlyMap<string, GuidelineEntry>;

  constructor(seed: readonly GuidelineEntry[] = MOCK_GUIDELINES_SEED) {
    this.index = new Map(seed.map((g) => [g.id, g]));
  }

  async searchByCondition(
    condition: string,
    maxResults = 10,
  ): Promise<Result<readonly GuidelineEntry[], Error>> {
    const lower = condition.toLowerCase();
    const matches = [...this.index.values()]
      .filter(
        (g) =>
          g.condition.toLowerCase().includes(lower) ||
          g.topic.toLowerCase().includes(lower) ||
          g.tags.some((t) => t.toLowerCase().includes(lower)),
      )
      .slice(0, maxResults);
    return ok(matches);
  }

  async getById(id: string): Promise<Result<GuidelineEntry, Error>> {
    const entry = this.index.get(id);
    if (!entry) {
      return err(new Error(`Guidelines: entry not found: ${id}`));
    }
    return ok(entry);
  }

  async search(query: SourceQuery): Promise<Result<readonly SourceDocument[], Error>> {
    const lower = query.keywords.map((k) => k.toLowerCase());
    const matches = [...this.index.values()]
      .filter((g) =>
        lower.some(
          (kw) =>
            g.condition.toLowerCase().includes(kw) ||
            g.topic.toLowerCase().includes(kw) ||
            g.tags.some((t) => t.toLowerCase().includes(kw)),
        ),
      )
      .slice(0, query.maxResults)
      .map((g): SourceDocument => ({
        id: g.id,
        url: g.url,
        title: g.title,
        snippet: `${g.organization} (${g.year}): ${g.recommendation.slice(0, 200)}`,
        publishedAt: `${g.year}-01-01T00:00:00.000Z`,
        metadata: {
          organization: g.organization,
          strength: g.strength,
          evidenceQuality: g.evidenceQuality,
          condition: g.condition,
        },
      }));
    return ok(matches);
  }

  async fetch(id: string): Promise<Result<SourceDocument, Error>> {
    const result = await this.getById(id);
    if (!result.ok) return result;
    const g = result.value;
    return ok({
      id: g.id,
      url: g.url,
      title: g.title,
      snippet: `${g.organization} (${g.year}): ${g.recommendation.slice(0, 200)}`,
      publishedAt: `${g.year}-01-01T00:00:00.000Z`,
      metadata: {
        organization: g.organization,
        strength: g.strength,
        evidenceQuality: g.evidenceQuality,
        condition: g.condition,
      },
    });
  }
}

const MOCK_GUIDELINES_SEED: readonly GuidelineEntry[] = [
  {
    id: "uspstf-breast-cancer-2024",
    title: "Breast Cancer: Screening",
    organization: "USPSTF",
    topic: "cancer screening",
    condition: "breast cancer",
    recommendation:
      "The USPSTF recommends biennial screening mammography for women aged 40 to 74 years.",
    strength: "B",
    evidenceQuality: "moderate",
    year: 2024,
    url: "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/breast-cancer-screening",
    tags: ["mammography", "breast cancer", "screening", "women", "preventive"],
  },
  {
    id: "aha-acc-hypertension-2017",
    title: "2017 Guideline for the Prevention, Detection, Evaluation, and Management of High Blood Pressure in Adults",
    organization: "AHA/ACC",
    topic: "hypertension management",
    condition: "hypertension",
    recommendation:
      "Adults with confirmed hypertension (≥130/80 mmHg) and estimated 10-year CVD risk ≥10% should be treated with a blood pressure-lowering medication.",
    strength: "A",
    evidenceQuality: "high",
    year: 2017,
    url: "https://www.ahajournals.org/doi/10.1161/HYP.0000000000000065",
    tags: ["blood pressure", "hypertension", "cardiovascular", "antihypertensive"],
  },
  {
    id: "ada-diabetes-standards-2024",
    title: "Standards of Care in Diabetes – 2024",
    organization: "American Diabetes Association",
    topic: "diabetes management",
    condition: "type 2 diabetes",
    recommendation:
      "Metformin remains the preferred initial pharmacologic agent for type 2 diabetes management when tolerated and not contraindicated.",
    strength: "A",
    evidenceQuality: "high",
    year: 2024,
    url: "https://diabetesjournals.org/care/article/47/Supplement_1/S158/153955",
    tags: ["diabetes", "metformin", "glucose", "HbA1c", "insulin"],
  },
  {
    id: "nice-statin-lipids-2023",
    title: "Cardiovascular disease: risk assessment and reduction, including lipid modification",
    organization: "NICE",
    topic: "lipid management",
    condition: "hypercholesterolaemia",
    recommendation:
      "Offer atorvastatin 20 mg for primary prevention of CVD to people who have a 10-year CVD risk of 10% or more.",
    strength: "A",
    evidenceQuality: "high",
    year: 2023,
    url: "https://www.nice.org.uk/guidance/cg181",
    tags: ["statins", "cholesterol", "atorvastatin", "cardiovascular", "LDL"],
  },
];

/** Factory for the mock guidelines port. */
export function createMockGuidelinesSource(seed?: readonly GuidelineEntry[]): GuidelinesPort {
  return new MockGuidelinesSource(seed);
}
