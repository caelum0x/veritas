// LLM-backed bias analysis port: uses VerifierLLM to detect nuanced bias beyond rule-based heuristics.
import type { Result } from "@veritas/core";
import { ok, err, isOk } from "@veritas/core";
import type { VerifierLLM } from "@veritas/llm";
import type { BiasFlag } from "./flags.js";
import { LLMBiasAnalysisError } from "./errors.js";

export interface LLMBiasResult {
  readonly flags: ReadonlyArray<BiasFlag>;
  readonly overallAssessment: string;
  readonly neutralRewrite: string;
  readonly modelId: string;
  readonly tokensUsed: number;
}

export interface LLMBiasPort {
  analyze(text: string, signal?: AbortSignal): Promise<Result<LLMBiasResult, LLMBiasAnalysisError>>;
}

const BIAS_PROMPT_PREFIX = `You are a professional media bias analyst. Analyze the following text for bias indicators including loaded language, political framing, emotional appeals, and one-sided presentation. Respond ONLY with a JSON object:
{
  "flags": [{"type":"loaded-language"|"sentiment"|"framing"|"subjectivity"|"political"|"source-quality"|"llm-detected","severity":"low"|"medium"|"high"|"critical","description":"string","confidence":0.0}],
  "overallAssessment":"string",
  "neutralRewrite":"string"
}

Text to analyze:
`;

function parseLLMJson(
  raw: string,
  fallbackText: string,
): { flags: BiasFlag[]; overallAssessment: string; neutralRewrite: string } | null {
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    const parsed: unknown = JSON.parse(jsonMatch[0]);
    if (typeof parsed !== "object" || parsed === null) return null;
    const obj = parsed as Record<string, unknown>;
    const rawFlags = Array.isArray(obj["flags"]) ? (obj["flags"] as unknown[]) : [];
    const flags: BiasFlag[] = rawFlags
      .filter((f): f is Record<string, unknown> => typeof f === "object" && f !== null)
      .map((f) => ({
        type: (f["type"] as BiasFlag["type"]) ?? "llm-detected",
        severity: (f["severity"] as BiasFlag["severity"]) ?? "medium",
        description: typeof f["description"] === "string" ? f["description"] : "LLM-detected bias",
        confidence: typeof f["confidence"] === "number"
          ? Math.max(0, Math.min(1, f["confidence"]))
          : 0.7,
      }));
    return {
      flags,
      overallAssessment:
        typeof obj["overallAssessment"] === "string"
          ? obj["overallAssessment"]
          : "See flags for details.",
      neutralRewrite:
        typeof obj["neutralRewrite"] === "string" ? obj["neutralRewrite"] : fallbackText,
    };
  } catch {
    return null;
  }
}

/** LLM-backed bias port using the VerifierLLM adjudicate interface. */
export class LLMBiasPortImpl implements LLMBiasPort {
  readonly #llm: VerifierLLM;

  constructor(llm: VerifierLLM) {
    this.#llm = llm;
  }

  async analyze(
    inputText: string,
    signal?: AbortSignal,
  ): Promise<Result<LLMBiasResult, LLMBiasAnalysisError>> {
    const claimText = `${BIAS_PROMPT_PREFIX}${inputText}`;

    const result = await this.#llm.adjudicate(claimText, {
      signal,
      maxOutputTokens: 1024,
    });

    if (!isOk(result)) {
      const msg = result.error instanceof Error ? result.error.message : "unknown error";
      return err(new LLMBiasAnalysisError(`LLM adjudication failed: ${msg}`));
    }

    const adjudication = result.value;
    // explanation contains the free-form LLM response text we parse for JSON
    const rawText = adjudication.explanation;

    const parsed = parseLLMJson(rawText, inputText);
    if (!parsed) {
      // Fall back: treat explanation as the assessment with no structured flags
      return ok({
        flags: [],
        overallAssessment: rawText.slice(0, 500),
        neutralRewrite: inputText,
        modelId: adjudication.modelId,
        tokensUsed: adjudication.tokensUsed,
      });
    }

    return ok({
      flags: parsed.flags,
      overallAssessment: parsed.overallAssessment,
      neutralRewrite: parsed.neutralRewrite,
      modelId: adjudication.modelId,
      tokensUsed: adjudication.tokensUsed,
    });
  }
}

/** No-op LLM bias port for environments without LLM access. */
export class NoopLLMBiasPort implements LLMBiasPort {
  async analyze(inputText: string): Promise<Result<LLMBiasResult, LLMBiasAnalysisError>> {
    return ok({
      flags: [],
      overallAssessment: "LLM analysis not available in this environment.",
      neutralRewrite: inputText,
      modelId: "noop",
      tokensUsed: 0,
    });
  }
}

export function createLLMBiasPort(llm?: VerifierLLM): LLMBiasPort {
  return llm ? new LLMBiasPortImpl(llm) : new NoopLLMBiasPort();
}
