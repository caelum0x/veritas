// fact-check MCP prompt — guides an LLM through structured claim verification.
import type { McpPrompt, McpPromptResult } from "../prompt.js";

/** Builds the system-level fact-check instructions block. */
function systemInstructions(): string {
  return [
    "You are Veritas, an enterprise-grade fact-verification assistant.",
    "Your task is to verify claims found in the provided text with rigorous sourcing.",
    "",
    "Follow this process for each identified claim:",
    "1. STATE the claim clearly and unambiguously.",
    "2. SEARCH for primary and secondary sources that confirm or refute the claim.",
    "3. EVALUATE source credibility (peer-reviewed > authoritative institutions > news > blogs).",
    "4. ADJUDICATE: assign one of [SUPPORTED, REFUTED, UNVERIFIABLE, DISPUTED, MISLEADING].",
    "5. CITE every source with URL, publication date, and relevance score (0-1).",
    "6. SUMMARIZE your confidence (0-1) and overall verdict.",
    "",
    "Output a structured JSON object with fields:",
    '  { "claims": [ { "text", "verdict", "confidence", "citations": [ { "url", "title", "stance" } ] } ], "overallTrustScore" }',
  ].join("\n");
}

/** Render the user message for fact-checking. */
function userMessage(text: string, context?: string, effort?: string): string {
  const parts: string[] = [];

  if (context !== undefined && context.trim().length > 0) {
    parts.push(`Context: ${context.trim()}`);
    parts.push("");
  }

  parts.push(`Text to fact-check:\n${text.trim()}`);

  if (effort !== undefined) {
    const effortNote =
      effort === "high"
        ? "Use maximum depth: gather at least 5 sources per claim."
        : effort === "low"
          ? "Use lightweight mode: gather 1-2 sources per claim."
          : "Use standard depth: gather 2-3 sources per claim.";
    parts.push(`\nEffort level: ${effortNote}`);
  }

  return parts.join("\n");
}

/** MCP fact-check prompt — renders a structured verification dialogue. */
export const factCheckPrompt: McpPrompt = {
  name: "fact_check",
  description:
    "Generates a structured fact-checking dialogue for verifying claims in text. " +
    "Produces a system prompt with verification methodology and a user message with the target text.",

  arguments: [
    {
      name: "text",
      description: "The text containing claims to verify.",
      required: true,
    },
    {
      name: "context",
      description: "Optional background context to help interpret ambiguous claims.",
      required: false,
    },
    {
      name: "effort",
      description: 'Verification depth: "low" | "standard" | "high". Defaults to "standard".',
      required: false,
    },
  ],

  async render(args: Readonly<Record<string, string>>): Promise<McpPromptResult> {
    const text = args["text"] ?? "";
    if (text.trim().length === 0) {
      return {
        description: "Fact-check prompt (empty input)",
        messages: [
          {
            role: "user",
            content: { type: "text", text: "No text provided for fact-checking." },
          },
        ],
      };
    }

    const context = args["context"];
    const effort = args["effort"];

    return {
      description: "Veritas structured fact-checking prompt",
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `${systemInstructions()}\n\n---\n\n${userMessage(text, context, effort)}`,
          },
        },
      ],
    };
  },
};
