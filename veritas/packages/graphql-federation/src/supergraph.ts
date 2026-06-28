// Supergraph composition: merges multiple subgraph SDL strings into a composed supergraph descriptor.
import { z } from "zod";
import type { SubgraphDefinition } from "./subgraph.js";
import type { SupergraphConfig } from "./types.js";

export const ComposeOptionsSchema = z.object({
  name: z.string().min(1).default("supergraph"),
  version: z.string().default("2.0"),
  includeEntityDirectives: z.boolean().default(true),
});
export type ComposeOptions = z.infer<typeof ComposeOptionsSchema>;

function buildEntityUnionSdl(entityTypeNames: ReadonlyArray<string>): string {
  if (entityTypeNames.length === 0) return "";
  const union = entityTypeNames.join(" | ");
  return `union _Entity = ${union}\n`;
}

function buildServiceSdl(): string {
  return [
    "type _Service {",
    "  sdl: String",
    "}",
    "",
    "extend type Query {",
    "  _service: _Service!",
    "  _entities(representations: [_Any!]!): [_Entity]!",
    "}",
    "",
    "scalar _Any",
    "scalar FieldSet",
    "",
  ].join("\n");
}

function stripExtendRoots(sdl: string): string {
  return sdl
    .replace(/\bextend\s+schema\s*\{[^}]*\}/g, "")
    .replace(/\bextend\s+type\s+Query\b[^{]*\{[^}]*\}/g, "");
}

export function composeSupergraph(
  subgraphs: ReadonlyArray<SubgraphDefinition>,
  opts: Partial<ComposeOptions> = {}
): SupergraphConfig {
  const options = ComposeOptionsSchema.parse(opts);
  const entityTypeNames = Array.from(
    new Set(subgraphs.flatMap((s) => s.entities.map((e) => e.typeName)))
  );

  const strippedSdls = subgraphs.map((s) => stripExtendRoots(s.subgraph.sdl)).join("\n\n");

  const entityUnion = options.includeEntityDirectives
    ? buildEntityUnionSdl(entityTypeNames)
    : "";

  const sdl = [
    `# Composed supergraph: ${options.name} v${options.version}`,
    `# Subgraphs: ${subgraphs.map((s) => s.subgraph.name).join(", ")}`,
    "",
    buildServiceSdl(),
    entityUnion,
    strippedSdls,
  ]
    .filter(Boolean)
    .join("\n");

  return Object.freeze({
    name: options.name,
    subgraphNames: Object.freeze(subgraphs.map((s) => s.subgraph.name)),
    sdl,
    version: options.version,
    composedAt: new Date().toISOString(),
  });
}

export function supergraphToDescriptor(config: SupergraphConfig): string {
  return JSON.stringify(
    {
      name: config.name,
      version: config.version,
      composedAt: config.composedAt,
      subgraphs: config.subgraphNames,
      sdl: config.sdl,
    },
    null,
    2
  );
}

export function validateSupergraphConfig(config: unknown): config is SupergraphConfig {
  if (typeof config !== "object" || config === null) return false;
  const c = config as Record<string, unknown>;
  return (
    typeof c["name"] === "string" &&
    typeof c["sdl"] === "string" &&
    typeof c["version"] === "string" &&
    typeof c["composedAt"] === "string" &&
    Array.isArray(c["subgraphNames"])
  );
}
