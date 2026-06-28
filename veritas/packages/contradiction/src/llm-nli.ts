// LLM-backed NLI implementation using VerifierLLM adjudication prompts.
import { ok, err, isErr } from "@veritas/core";
import type { Result, AppError } from "@veritas/core";
import type { VerifierLLM } from "@veritas/llm";
import type { NliPort, NliOptions } from "./nli-port.js";
import type { ClaimPair } from "./pair.js";
import { withScore } from "./pair.js";
import type { NliScore, NliRelation } from "./relation.js";
import { NliError } from "./errors.js";

const SYSTEM_PROMPT = `You are an NLI (natural-language inference) classifier.
Given a PREMISE and a HYPOTHESIS, classify their relation as one of:
- entailment: the hypothesis logically follows from the premise
- contradiction: the hypothesis is in direct conflict with the premise
- neutral: neither entailment nor contradiction

Respond with valid JSON only:
{"relation":"<entailment|contradiction|neutral>","confidence":<0-1 float>,"entailment":<float>,"contradiction":<float>,"neutral":<float>}`;

function buildPrompt(premise: string, hypothesis: string): string {
  return `PREMISE: ${premise}\nHYPOTHESIS: ${hypothesis}`;
}

interface RawNliResponse {
  relation: string;
  confidence: number;
  entailment: number;
  contradiction: number;
  neutral: number;
}

function parseNliJson(raw: string): Result<NliScore, AppError> {
  try {
    const stripped = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(stripped) as RawNliResponse;
    const validRelations: NliRelation[] = [
      "entailment",
      "contradiction",
      "neutral",
    ];
    if (!validRelations.includes(parsed.relation as NliRelation)) {
      return err(new NliError(`Invalid relation: ${parsed.relation}`));
    }
    const score: NliScore = {
      relation: parsed.relation as NliRelation,
      confidence: Math.min(1, Math.max(0, parsed.confidence ?? 0.5)),
      scores: {
        entailment: parsed.entailment ?? 0,
        contradiction: parsed.contradiction ?? 0,
        neutral: parsed.neutral ?? 0,
      },
    };
    return ok(score);
  } catch (e) {
    return err(new NliError(`Failed to parse NLI response: ${String(e)}`));
  }
}

export class LlmNli implements NliPort {
  readonly name = "llm-nli";

  constructor(private readonly llm: VerifierLLM) {}

  async classify(
    pair: ClaimPair,
    options?: NliOptions,
  ): Promise<Result<ClaimPair, AppError>> {
    const prompt = buildPrompt(pair.premise.text, pair.hypothesis.text);
    const adjResult = await this.llm.adjudicate(prompt, {
      signal: options?.signal,
      researchResult: {
        claimText: prompt,
        evidence: [],
        searchQueriesIssued: 0,
        tokensUsed: 0,
        modelId: "",
      },
    });

    if (isErr(adjResult)) {
      return err(adjResult.error);
    }

    const rawText =
      adjResult.value.explanation ?? JSON.stringify(adjResult.value);
    const scoreResult = parseNliJson(rawText);
    if (isErr(scoreResult)) return err(scoreResult.error);

    return ok(withScore(pair, scoreResult.value));
  }

  async classifyBatch(
    pairs: ReadonlyArray<ClaimPair>,
    options?: NliOptions,
  ): Promise<Result<ReadonlyArray<ClaimPair>, AppError>> {
    const results: ClaimPair[] = [];
    for (const pair of pairs) {
      const r = await this.classify(pair, options);
      if (isErr(r)) return err(r.error);
      results.push(r.value);
    }
    return ok(results);
  }
}
