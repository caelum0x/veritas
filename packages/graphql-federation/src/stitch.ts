// Schema stitching: merges multiple subgraph SDL strings into a unified schema descriptor.
import { z } from "zod";
import { ok, err, type Result } from "@veritas/core";
import type { StitchingLink } from "./types.js";
import { SchemaStitchError } from "./errors.js";

const SubgraphSdlSchema = z.object({
  name: z.string().min(1),
  sdl: z.string().min(1),
});
export type SubgraphSdl = z.infer<typeof SubgraphSdlSchema>;

export const StitchConfigSchema = z.object({
  subgraphs: z.array(SubgraphSdlSchema).min(1),
  links: z.array(
    z.object({
      leftField: z.string().min(1),
      rightField: z.string().min(1),
      leftTypeName: z.string().min(1),
      rightTypeName: z.string().min(1),
      subgraphName: z.string().min(1),
    })
  ).default([]),
  mergeDirectives: z.boolean().default(true),
});
export type StitchConfig = z.infer<typeof StitchConfigSchema>;

export interface StitchedSchema {
  readonly mergedSdl: string;
  readonly typeIndex: ReadonlyMap<string, ReadonlyArray<string>>;
  readonly subgraphCount: number;
  readonly linkCount: number;
}

function extractTypeNames(sdl: string): ReadonlyArray<string> {
  const matches = [...sdl.matchAll(/(?:type|interface|union|enum|input|scalar)\s+(\w+)/g)];
  return matches.map((m) => m[1] as string);
}

function buildTypeIndex(
  subgraphs: ReadonlyArray<SubgraphSdl>
): ReadonlyMap<string, ReadonlyArray<string>> {
  const index = new Map<string, string[]>();
  for (const sg of subgraphs) {
    for (const typeName of extractTypeNames(sg.sdl)) {
      const existing = index.get(typeName) ?? [];
      index.set(typeName, [...existing, sg.name]);
    }
  }
  return index as ReadonlyMap<string, ReadonlyArray<string>>;
}

function detectConflicts(
  typeIndex: ReadonlyMap<string, ReadonlyArray<string>>,
  links: ReadonlyArray<StitchingLink>
): ReadonlyArray<string> {
  const conflicts: string[] = [];
  const linkedTypes = new Set(links.flatMap((l) => [l.leftTypeName, l.rightTypeName]));
  for (const [typeName, subgraphs] of typeIndex) {
    if (subgraphs.length > 1 && !linkedTypes.has(typeName)) {
      conflicts.push(`Type "${typeName}" defined in multiple subgraphs without a stitching link: [${subgraphs.join(", ")}]`);
    }
  }
  return conflicts;
}

function composeMergedSdl(
  subgraphs: ReadonlyArray<SubgraphSdl>,
  links: ReadonlyArray<StitchingLink>,
  mergeDirectives: boolean
): string {
  const header = [
    `# Stitched schema — ${subgraphs.length} subgraph(s)`,
    `# Subgraphs: ${subgraphs.map((s) => s.name).join(", ")}`,
    mergeDirectives ? `directive @merge(keyField: String, keyArg: String, subgraph: String) on FIELD_DEFINITION` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const linkDirectives = links
    .map(
      (l) =>
        `# link: ${l.leftTypeName}.${l.leftField} -> ${l.rightTypeName}.${l.rightField} [${l.subgraphName}]`
    )
    .join("\n");

  const bodies = subgraphs
    .map((sg) => `# === ${sg.name} ===\n${sg.sdl}`)
    .join("\n\n");

  return [header, linkDirectives, bodies].filter(Boolean).join("\n\n");
}

export function stitchSchemas(
  rawConfig: unknown
): Result<StitchedSchema, SchemaStitchError> {
  const parsed = StitchConfigSchema.safeParse(rawConfig);
  if (!parsed.success) {
    return err(
      new SchemaStitchError(
        `Invalid stitch config: ${parsed.error.issues.map((i) => i.message).join(", ")}`
      )
    );
  }
  const { subgraphs, links, mergeDirectives } = parsed.data;
  const typeIndex = buildTypeIndex(subgraphs);
  const conflicts = detectConflicts(typeIndex, links);
  if (conflicts.length > 0) {
    const conflictingTypes = [...typeIndex.keys()].filter((t) => (typeIndex.get(t)?.length ?? 0) > 1);
    return err(new SchemaStitchError(conflicts.join("; "), conflictingTypes));
  }
  const mergedSdl = composeMergedSdl(subgraphs, links, mergeDirectives);
  const result: StitchedSchema = Object.freeze({
    mergedSdl,
    typeIndex,
    subgraphCount: subgraphs.length,
    linkCount: links.length,
  });
  return ok(result);
}

export function addStitchingLink(
  current: StitchedSchema,
  link: StitchingLink
): StitchedSchema {
  const annotation = `\n# link: ${link.leftTypeName}.${link.leftField} -> ${link.rightTypeName}.${link.rightField} [${link.subgraphName}]`;
  return Object.freeze({
    ...current,
    mergedSdl: current.mergedSdl + annotation,
    linkCount: current.linkCount + 1,
  });
}

export function stitchedSchemaToDescriptor(schema: StitchedSchema): Record<string, unknown> {
  return Object.freeze({
    subgraphCount: schema.subgraphCount,
    linkCount: schema.linkCount,
    typeCount: schema.typeIndex.size,
    mergedSdlLength: schema.mergedSdl.length,
  });
}
