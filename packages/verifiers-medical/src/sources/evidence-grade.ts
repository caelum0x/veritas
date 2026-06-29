// EvidenceGrade port: abstract interface and mock for grading medical evidence quality (e.g. GRADE, Oxford levels).

import { ok, err, type Result } from "@veritas/core";
import { type DataSourcePort, type SourceDocument, type SourceQuery } from "@veritas/verifier-kit";

/** Evidence grading system used to classify quality. */
export type GradingSystem = "GRADE" | "Oxford" | "USPSTF" | "SIGN";

/** GRADE-based quality level for a body of evidence. */
export type GradeQuality = "high" | "moderate" | "low" | "very_low";

/** Oxford Centre for Evidence-Based Medicine level. */
export type OxfordLevel = "1a" | "1b" | "2a" | "2b" | "3a" | "3b" | "4" | "5";

/** A graded evidence entry linking a clinical question to its quality assessment. */
export interface EvidenceGradeEntry {
  readonly id: string;
  readonly clinicalQuestion: string;
  readonly intervention: string;
  readonly outcome: string;
  readonly studyDesign: string;
  readonly sampleSize: number | null;
  readonly gradingSystem: GradingSystem;
  readonly gradeQuality: GradeQuality | null;
  readonly oxfordLevel: OxfordLevel | null;
  readonly recommendationStrength: "strong" | "conditional" | "weak" | "none";
  readonly summary: string;
  readonly sourceTitle: string;
  readonly doi: string | null;
  readonly publishedYear: number;
  readonly url: string;
  readonly tags: readonly string[];
}

/** Port interface for retrieving and grading medical evidence. */
export interface EvidenceGradePort extends DataSourcePort {
  /** Find evidence grades for a given intervention or condition. */
  findByIntervention(intervention: string, maxResults?: number): Promise<Result<readonly EvidenceGradeEntry[], Error>>;
  /** Retrieve a specific graded evidence entry by ID. */
  getById(id: string): Promise<Result<EvidenceGradeEntry, Error>>;
  /** Grade a body of evidence described by free text (returns best-matching entries). */
  gradeEvidence(description: string, maxResults?: number): Promise<Result<readonly EvidenceGradeEntry[], Error>>;
}

/** In-memory mock EvidenceGradePort for development and testing. */
export class MockEvidenceGradeSource implements EvidenceGradePort {
  readonly sourceId = "evidence-grade";
  readonly displayName = "Medical Evidence Grader (Mock)";

  private readonly byId: ReadonlyMap<string, EvidenceGradeEntry>;
  private readonly entries: readonly EvidenceGradeEntry[];

  constructor(seed: readonly EvidenceGradeEntry[] = MOCK_EVIDENCE_GRADE_SEED) {
    this.byId = new Map(seed.map((e) => [e.id, e]));
    this.entries = seed;
  }

  async findByIntervention(
    intervention: string,
    maxResults = 10,
  ): Promise<Result<readonly EvidenceGradeEntry[], Error>> {
    const lower = intervention.toLowerCase();
    const matches = this.entries
      .filter(
        (e) =>
          e.intervention.toLowerCase().includes(lower) ||
          e.tags.some((t) => t.toLowerCase().includes(lower)),
      )
      .slice(0, maxResults);
    return ok(matches);
  }

  async getById(id: string): Promise<Result<EvidenceGradeEntry, Error>> {
    const entry = this.byId.get(id);
    if (!entry) {
      return err(new Error(`EvidenceGrade: entry not found: ${id}`));
    }
    return ok(entry);
  }

  async gradeEvidence(
    description: string,
    maxResults = 5,
  ): Promise<Result<readonly EvidenceGradeEntry[], Error>> {
    const terms = description.toLowerCase().split(/\s+/).filter((t) => t.length > 3);
    const scored = this.entries
      .map((e) => {
        const haystack = [
          e.clinicalQuestion,
          e.intervention,
          e.outcome,
          e.summary,
          ...e.tags,
        ]
          .join(" ")
          .toLowerCase();
        const matchCount = terms.filter((t) => haystack.includes(t)).length;
        return { entry: e, matchCount };
      })
      .filter(({ matchCount }) => matchCount > 0)
      .sort((a, b) => b.matchCount - a.matchCount)
      .slice(0, maxResults)
      .map(({ entry }) => entry);
    return ok(scored);
  }

  async search(query: SourceQuery): Promise<Result<readonly SourceDocument[], Error>> {
    const lower = query.keywords.map((k) => k.toLowerCase());
    const matches = this.entries
      .filter((e) =>
        lower.some(
          (kw) =>
            e.intervention.toLowerCase().includes(kw) ||
            e.clinicalQuestion.toLowerCase().includes(kw) ||
            e.tags.some((t) => t.toLowerCase().includes(kw)),
        ),
      )
      .slice(0, query.maxResults)
      .map((e): SourceDocument => ({
        id: e.id,
        url: e.url,
        title: e.sourceTitle,
        snippet: `${e.gradingSystem} quality: ${e.gradeQuality ?? e.oxfordLevel}. ${e.summary.slice(0, 180)}`,
        publishedAt: `${e.publishedYear}-01-01T00:00:00.000Z`,
        metadata: {
          gradingSystem: e.gradingSystem,
          gradeQuality: e.gradeQuality,
          oxfordLevel: e.oxfordLevel,
          recommendationStrength: e.recommendationStrength,
          doi: e.doi,
        },
      }));
    return ok(matches);
  }

  async fetch(id: string): Promise<Result<SourceDocument, Error>> {
    const result = await this.getById(id);
    if (!result.ok) return result;
    const e = result.value;
    return ok({
      id: e.id,
      url: e.url,
      title: e.sourceTitle,
      snippet: `${e.gradingSystem} quality: ${e.gradeQuality ?? e.oxfordLevel}. ${e.summary.slice(0, 180)}`,
      publishedAt: `${e.publishedYear}-01-01T00:00:00.000Z`,
      metadata: {
        gradingSystem: e.gradingSystem,
        gradeQuality: e.gradeQuality,
        oxfordLevel: e.oxfordLevel,
        recommendationStrength: e.recommendationStrength,
        doi: e.doi,
      },
    });
  }
}

const MOCK_EVIDENCE_GRADE_SEED: readonly EvidenceGradeEntry[] = [
  {
    id: "grade-statins-cvd-primary-2022",
    clinicalQuestion: "Do statins reduce cardiovascular events in adults without prior CVD?",
    intervention: "statin therapy",
    outcome: "cardiovascular events, all-cause mortality",
    studyDesign: "systematic review of RCTs",
    sampleSize: 174149,
    gradingSystem: "GRADE",
    gradeQuality: "high",
    oxfordLevel: null,
    recommendationStrength: "strong",
    summary:
      "High-quality evidence supports statin use for primary prevention in adults with elevated CVD risk, reducing major events by ~25% (RR 0.75, 95% CI 0.70–0.81).",
    sourceTitle: "Statins for Primary Prevention of Cardiovascular Events: Cochrane Review 2022",
    doi: "10.1002/14651858.CD004816.pub6",
    publishedYear: 2022,
    url: "https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD004816.pub6",
    tags: ["statins", "cardiovascular", "primary prevention", "cholesterol", "LDL"],
  },
  {
    id: "grade-metformin-t2dm-2020",
    clinicalQuestion: "Is metformin effective as first-line treatment for type 2 diabetes?",
    intervention: "metformin",
    outcome: "HbA1c reduction, weight, cardiovascular outcomes",
    studyDesign: "meta-analysis of RCTs",
    sampleSize: 18218,
    gradingSystem: "GRADE",
    gradeQuality: "moderate",
    oxfordLevel: null,
    recommendationStrength: "strong",
    summary:
      "Moderate-quality evidence supports metformin as first-line pharmacotherapy for type 2 diabetes. HbA1c reduction ~1.12% vs placebo. Weight neutral to modest reduction.",
    sourceTitle: "Metformin for type 2 diabetes: BMJ Best Practice Evidence Summary 2020",
    doi: "10.1136/bmj.n1745",
    publishedYear: 2020,
    url: "https://bestpractice.bmj.com/topics/en-gb/7/evidence",
    tags: ["metformin", "diabetes", "type 2 diabetes", "HbA1c", "glucose"],
  },
  {
    id: "oxford-aspirin-secondary-prevention-2021",
    clinicalQuestion: "Does low-dose aspirin prevent recurrent cardiovascular events in adults with prior MI or stroke?",
    intervention: "low-dose aspirin",
    outcome: "recurrent MI, stroke, cardiovascular death",
    studyDesign: "systematic review of RCTs",
    sampleSize: 43000,
    gradingSystem: "Oxford",
    gradeQuality: null,
    oxfordLevel: "1a",
    recommendationStrength: "strong",
    summary:
      "Level 1a evidence (systematic review of RCTs) supports low-dose aspirin (75–100 mg/day) for secondary prevention, reducing recurrent events by ~20% in high-risk individuals.",
    sourceTitle: "Antiplatelet therapy for secondary prevention: Oxford EBM Level 1a",
    doi: "10.1093/eurheartj/ehab232",
    publishedYear: 2021,
    url: "https://academic.oup.com/eurheartj/article/42/25/2404/6265823",
    tags: ["aspirin", "antiplatelet", "secondary prevention", "myocardial infarction", "stroke"],
  },
  {
    id: "grade-antidepressants-mdd-2018",
    clinicalQuestion: "Are antidepressants effective for major depressive disorder?",
    intervention: "antidepressants (SSRIs, SNRIs, TCAs)",
    outcome: "response rate, remission, tolerability",
    studyDesign: "network meta-analysis of RCTs",
    sampleSize: 116477,
    gradingSystem: "GRADE",
    gradeQuality: "moderate",
    oxfordLevel: null,
    recommendationStrength: "strong",
    summary:
      "All 21 antidepressants studied were more efficacious than placebo (ORs 1.37–2.13). Agomelatine, amitriptyline, escitalopram, and mirtazapine showed best benefit-acceptability profiles.",
    sourceTitle: "Comparative efficacy and acceptability of 21 antidepressant drugs: Lancet 2018 NMA",
    doi: "10.1016/S0140-6736(17)32802-7",
    publishedYear: 2018,
    url: "https://www.thelancet.com/journals/lancet/article/PIIS0140-6736(17)32802-7/fulltext",
    tags: ["antidepressants", "depression", "MDD", "SSRI", "SNRI", "mental health"],
  },
  {
    id: "grade-antibiotics-acute-otitis-media-2023",
    clinicalQuestion: "Should antibiotics be prescribed for acute otitis media in children?",
    intervention: "antibiotics (amoxicillin)",
    outcome: "symptom resolution, complications",
    studyDesign: "systematic review of RCTs",
    sampleSize: 5352,
    gradingSystem: "GRADE",
    gradeQuality: "moderate",
    oxfordLevel: null,
    recommendationStrength: "conditional",
    summary:
      "Antibiotics modestly improve outcomes vs watchful waiting in children <2 years or severe bilateral AOM. Watchful waiting acceptable for mild unilateral AOM in children ≥2 years.",
    sourceTitle: "Antibiotics for acute otitis media in children: Cochrane Review 2023",
    doi: "10.1002/14651858.CD000219.pub4",
    publishedYear: 2023,
    url: "https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD000219.pub4",
    tags: ["antibiotics", "otitis media", "ear infection", "children", "pediatric", "amoxicillin"],
  },
];

/** Factory for the mock evidence grade port. */
export function createMockEvidenceGradeSource(seed?: readonly EvidenceGradeEntry[]): EvidenceGradePort {
  return new MockEvidenceGradeSource(seed);
}
