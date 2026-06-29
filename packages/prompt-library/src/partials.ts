// Reusable prompt partials — named text snippets substituted into templates before rendering.
import { type Result, ok, err } from "@veritas/core";

export type PartialMap = Record<string, string>;
export type VariableValues = Record<string, string>;

/** Registered partials store. */
const _partials: Map<string, string> = new Map();

/** Register a named partial snippet. */
export function registerPartial(name: string, content: string): void {
  _partials.set(name, content);
}

/** Retrieve a partial by name (undefined if absent). */
export function getPartial(name: string): string | undefined {
  return _partials.get(name);
}

/** List all registered partial names. */
export function listPartials(): string[] {
  return [..._partials.keys()];
}

/** Clear all registered partials (useful for testing). */
export function clearPartials(): void {
  _partials.clear();
}

const PLACEHOLDER_RE = /\{\{([A-Za-z_][A-Za-z0-9_]*)\}\}/g;

function substitute(text: string, vars: VariableValues): string {
  return text.replace(PLACEHOLDER_RE, (_, key: string) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? (vars[key] as string) : `{{${key}}}`
  );
}

/**
 * Resolve a list of partial names into a map of partial-name → rendered-content,
 * substituting variables into each partial's text.
 * Returns an err if a referenced partial is missing from both the provided map and
 * the global registry.
 */
export function resolvePartials(
  names: readonly string[],
  provided: PartialMap,
  vars: VariableValues
): Result<PartialMap> {
  const result: PartialMap = {};

  for (const name of names) {
    const raw =
      Object.prototype.hasOwnProperty.call(provided, name)
        ? provided[name]
        : _partials.get(name);

    if (raw === undefined) {
      return err(new Error(`Partial not found: ${name}`));
    }

    result[name] = substitute(raw, vars);
  }

  return ok(result);
}

/** Built-in partials installed by default at module load. */
export const BUILTIN_PARTIALS: PartialMap = {
  json_output_instruction:
    "Always respond with valid JSON only. Do not include markdown fences or prose outside the JSON object.",
  uncertainty_instruction:
    "If you are uncertain, express that uncertainty clearly. Do not fabricate facts.",
  citation_instruction:
    "Support every claim with a direct citation from the provided sources. Use the format [Source N].",
  conciseness_instruction:
    "Be concise. Omit filler phrases. Answer directly.",
};

for (const [name, content] of Object.entries(BUILTIN_PARTIALS)) {
  registerPartial(name, content);
}
