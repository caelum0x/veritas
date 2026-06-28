// Extractor: port interface + mock implementation for entity/relation extraction from claims.

import { z } from "zod";
import { Result, ok, err, tryAsync } from "@veritas/core";
import { type Entity, EntityType, makeEntity } from "./entity.js";
import { type Relation, RelationType, makeRelation } from "./relation.js";
import { type Triple, makeTriple } from "./triple.js";

/** Raw extraction output from an LLM or NLP backend. */
export const ExtractionResultSchema = z.object({
  entities: z.array(
    z.object({
      label: z.string(),
      type: z.string(),
      confidence: z.number().min(0).max(1),
      span: z.string().optional(),
    })
  ),
  relations: z.array(
    z.object({
      sourceLabel: z.string(),
      predicate: z.string(),
      targetLabel: z.string(),
      weight: z.number().min(0).max(1).optional(),
      span: z.string().optional(),
    })
  ),
});
export type ExtractionResult = z.infer<typeof ExtractionResultSchema>;

/** Port: implement this to swap in a real LLM backend. */
export interface ExtractorPort {
  extract(
    claimText: string,
    claimId: string
  ): Promise<Result<{ entities: Entity[]; relations: Relation[]; triples: Triple[] }>>;
}

/** Validate and coerce raw entity type strings to EntityType enum values. */
function toEntityType(raw: string): EntityType {
  const map: Record<string, EntityType> = {
    person: "person",
    organization: "organization",
    org: "organization",
    location: "location",
    loc: "location",
    date: "date",
    number: "number",
    event: "event",
    product: "product",
    concept: "concept",
  };
  return map[raw.toLowerCase()] ?? "unknown";
}

/** Validate and coerce raw predicate strings to RelationType enum values. */
function toRelationType(raw: string): RelationType {
  const map: Record<string, RelationType> = {
    claims: "claims",
    contradicts: "contradicts",
    supports: "supports",
    mentions: "mentions",
    causes: "causes",
    partof: "partOf",
    instanceof: "instanceOf",
    locatedin: "locatedIn",
    occursat: "occursAt",
    relatedto: "relatedTo",
  };
  return map[raw.toLowerCase().replace(/[_\s]/g, "")] ?? "relatedTo";
}

/** Build entity/relation/triple objects from a raw extraction result. */
function buildGraph(
  raw: ExtractionResult,
  claimId: string
): { entities: Entity[]; relations: Relation[]; triples: Triple[] } {
  const entityMap = new Map<string, Entity>();

  for (const e of raw.entities) {
    if (!entityMap.has(e.label)) {
      entityMap.set(e.label, makeEntity(e.label, toEntityType(e.type), { confidence: e.confidence }));
    }
  }

  const relations: Relation[] = [];
  const triples: Triple[] = [];

  for (const r of raw.relations) {
    const subject = entityMap.get(r.sourceLabel);
    const object = entityMap.get(r.targetLabel);
    if (!subject || !object) continue;

    const predicate = toRelationType(r.predicate);
    const relation = makeRelation(subject.id, object.id, predicate, {
      weight: r.weight ?? 1.0,
      label: r.span,
    });
    relations.push(relation);
    triples.push(
      makeTriple(subject.id, predicate, object.id, relation.id, claimId, {
        span: r.span,
        confidence: r.weight ?? 1.0,
      })
    );
  }

  return { entities: [...entityMap.values()], relations, triples };
}

/** Mock extractor: performs simple pattern-based extraction without calling an LLM. */
export class MockExtractorAdapter implements ExtractorPort {
  async extract(
    claimText: string,
    claimId: string
  ): Promise<Result<{ entities: Entity[]; relations: Relation[]; triples: Triple[] }>> {
    return tryAsync(async () => {
      // Naive heuristic: split on common verbs to infer subject-predicate-object
      const lower = claimText.trim();
      const verbPatterns: Array<{ re: RegExp; predicate: RelationType }> = [
        { re: /^(.+?)\s+contradicts?\s+(.+)$/i, predicate: "contradicts" },
        { re: /^(.+?)\s+supports?\s+(.+)$/i, predicate: "supports" },
        { re: /^(.+?)\s+causes?\s+(.+)$/i, predicate: "causes" },
        { re: /^(.+?)\s+mentions?\s+(.+)$/i, predicate: "mentions" },
        { re: /^(.+?)\s+claims?\s+(.+)$/i, predicate: "claims" },
      ];

      let matched = false;
      for (const { re, predicate } of verbPatterns) {
        const m = lower.match(re);
        if (m) {
          const group1 = m[1] ?? "";
          const group2 = m[2] ?? "";
          const raw: ExtractionResult = {
            entities: [
              { label: group1.trim(), type: "unknown", confidence: 0.7 },
              { label: group2.trim(), type: "concept", confidence: 0.7 },
            ],
            relations: [
              {
                sourceLabel: group1.trim(),
                predicate,
                targetLabel: group2.trim(),
                weight: 0.7,
                span: claimText,
              },
            ],
          };
          matched = true;
          return buildGraph(raw, claimId);
        }
      }

      if (!matched) {
        // Fall back: single entity node, no relations
        const entity = makeEntity(lower.slice(0, 80), "concept", { confidence: 0.5 });
        return { entities: [entity], relations: [], triples: [] };
      }

      return { entities: [], relations: [], triples: [] };
    });
  }
}
