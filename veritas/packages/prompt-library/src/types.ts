// Shared types for the prompt-library — rendering context, registry entries, eval metadata.
import { z } from "zod";
import { type PromptTemplate, type PromptMessage } from "./prompt.js";
import { type VersionedEntry } from "./version.js";

/** A flat map of variable name → string value supplied at render time. */
export type VariableMap = Readonly<Record<string, string>>;

/** The result of rendering a prompt template with its variables resolved. */
export interface RenderedPrompt {
  readonly promptId: string;
  readonly version: string;
  readonly messages: readonly PromptMessage[];
  readonly resolvedVariables: VariableMap;
}

/** A named partial snippet that can be embedded into prompt templates. */
export interface PromptPartial {
  readonly name: string;
  readonly description: string;
  readonly content: string;
}

/** Registry lookup entry combining template with its versioned history. */
export interface RegistryEntry {
  readonly id: string;
  readonly latest: PromptTemplate;
  readonly history: readonly VersionedEntry[];
}

/** Supported categories for built-in library prompts. */
export const PromptCategorySchema = z.enum([
  "verification",
  "extraction",
  "adjudication",
  "summarization",
  "general",
]);
export type PromptCategory = z.infer<typeof PromptCategorySchema>;

/** Evaluation metadata attached to a prompt for quality tracking. */
export interface PromptEvalMetadata {
  readonly promptId: string;
  readonly version: string;
  readonly passRate: number;
  readonly sampleCount: number;
  readonly evaluatedAt: string;
  readonly notes: string;
}

/** Options controlling how rendering handles missing variables. */
export interface RenderOptions {
  /** If true, missing required variables throw rather than leaving placeholders. */
  readonly strict: boolean;
  /** Override partials registry for this render call. */
  readonly partials?: Readonly<Record<string, string>>;
}

export const DEFAULT_RENDER_OPTIONS: RenderOptions = {
  strict: true,
};
