// Render prompt templates by substituting {{variable}} placeholders with provided values.
import { type Result, ok, err } from "@veritas/core";
import { type PromptTemplate, type PromptMessage } from "./prompt.js";
import { type PartialMap, resolvePartials } from "./partials.js";

export type VariableValues = Record<string, string>;

export interface RenderInput {
  readonly template: PromptTemplate;
  readonly variables: VariableValues;
  readonly partials?: PartialMap;
}

export interface RenderOutput {
  readonly messages: PromptMessage[];
  readonly resolvedVariables: VariableValues;
}

const PLACEHOLDER_RE = /\{\{([A-Za-z_][A-Za-z0-9_]*)\}\}/g;

function substitute(text: string, vars: VariableValues): string {
  return text.replace(PLACEHOLDER_RE, (_, key: string) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? (vars[key] as string) : `{{${key}}}`
  );
}

function extractPlaceholders(text: string): string[] {
  const found: string[] = [];
  let match: RegExpExecArray | null;
  const re = new RegExp(PLACEHOLDER_RE.source, "g");
  while ((match = re.exec(text)) !== null) {
    const key = match[1];
    if (key !== undefined) found.push(key);
  }
  return found;
}

/** Render a prompt template, returning typed messages or a validation error. */
export function renderPrompt(input: RenderInput): Result<RenderOutput> {
  const { template, variables, partials = {} } = input;

  // Validate required variables.
  const missing: string[] = [];
  for (const variable of template.variables) {
    if (variable.required && !(variable.name in variables)) {
      if (variable.defaultValue === undefined) {
        missing.push(variable.name);
      }
    }
  }
  if (missing.length > 0) {
    return err(new Error(`Missing required variables: ${missing.join(", ")}`));
  }

  // Build resolved variable map, applying defaults.
  const resolved: VariableValues = {};
  for (const variable of template.variables) {
    if (variable.name in variables) {
      resolved[variable.name] = variables[variable.name] as string;
    } else if (variable.defaultValue !== undefined) {
      resolved[variable.name] = variable.defaultValue;
    }
  }

  // Resolve partials referenced in template.
  const partialResult = resolvePartials(template.partials, partials, resolved);
  if (partialResult.ok === false) return partialResult;

  const partialVars: VariableValues = { ...resolved, ...partialResult.value };

  // Render messages.
  const messages: PromptMessage[] = template.messages.map((msg) => ({
    role: msg.role,
    content: substitute(msg.content, partialVars),
  }));

  // Check for unresolved placeholders in rendered messages.
  const unresolved = new Set<string>();
  for (const msg of messages) {
    for (const p of extractPlaceholders(msg.content)) {
      unresolved.add(p);
    }
  }
  if (unresolved.size > 0) {
    return err(new Error(`Unresolved placeholders: ${[...unresolved].join(", ")}`));
  }

  return ok({ messages, resolvedVariables: resolved });
}
