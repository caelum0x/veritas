// @key directive helpers: builds and parses federation @key directives for entity identification.
import { z } from "zod";
import { FederationKeySchema, type FederationKey } from "./types.js";

export const KeyDirectiveOptionsSchema = z.object({
  typeName: z.string().min(1),
  fields: z.string().min(1),
  resolvable: z.boolean().default(true),
});
export type KeyDirectiveOptions = z.infer<typeof KeyDirectiveOptionsSchema>;

export function buildKeyDirective(opts: KeyDirectiveOptions): string {
  const resolvablePart = opts.resolvable ? "" : " resolvable: false";
  return `@key(fields: "${opts.fields}"${resolvablePart})`;
}

export function buildKeyDirectives(keys: ReadonlyArray<FederationKey>): string {
  return keys.map((k) =>
    buildKeyDirective({ typeName: k.typeName, fields: k.fields, resolvable: k.resolvable })
  ).join(" ");
}

export function parseKeyDirective(directive: string): FederationKey | null {
  const fieldsMatch = /fields:\s*"([^"]+)"/.exec(directive);
  const typeMatch = /type\s+(\w+)/.exec(directive);
  const resolvableMatch = /resolvable:\s*(true|false)/.exec(directive);

  if (!fieldsMatch) return null;

  return FederationKeySchema.parse({
    typeName: typeMatch?.[1] ?? "Unknown",
    fields: fieldsMatch[1],
    resolvable: resolvableMatch ? resolvableMatch[1] === "true" : true,
  });
}

export function compoundKey(fieldPaths: ReadonlyArray<string>): string {
  return fieldPaths.join(" ");
}

export function nestedKey(parent: string, children: ReadonlyArray<string>): string {
  return `${parent} { ${children.join(" ")} }`;
}

export function keyMatchesRepresentation(
  key: FederationKey,
  representation: Record<string, unknown>
): boolean {
  const topLevelFields = key.fields
    .split(/\s+/)
    .map((f) => f.replace(/\s*\{.*\}/, "").trim())
    .filter(Boolean);
  return topLevelFields.every((field) => field in representation);
}

export function selectKeyFields(
  key: FederationKey,
  obj: Record<string, unknown>
): Record<string, unknown> {
  const topLevelFields = key.fields
    .split(/\s+/)
    .map((f) => f.replace(/\s*\{.*\}/, "").trim())
    .filter(Boolean);
  return Object.fromEntries(
    topLevelFields
      .filter((f) => f in obj)
      .map((f) => [f, obj[f]])
  );
}

export function createKey(
  typeName: string,
  fields: string,
  resolvable = true
): FederationKey {
  return FederationKeySchema.parse({ typeName, fields, resolvable });
}
