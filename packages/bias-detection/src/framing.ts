// Framing analysis: detects how issues are framed (conflict, economic, human-interest, etc.)

import type { Result } from "@veritas/core";
import { ok } from "@veritas/core";

export type FrameType =
  | "conflict"
  | "economic"
  | "human_interest"
  | "moral"
  | "attribution"
  | "fear"
  | "progress"
  | "loss"
  | "neutral";

export interface FrameSignal {
  readonly frameType: FrameType;
  readonly confidence: number; // 0-1
  readonly triggerTerms: ReadonlyArray<string>;
}

export interface FramingAnalysis {
  /** Dominant detected frame */
  readonly dominantFrame: FrameType;
  /** All detected frames with confidence scores */
  readonly frames: ReadonlyArray<FrameSignal>;
  /** Whether multiple competing frames exist (indicates potential spin) */
  readonly hasCompetingFrames: boolean;
  /** Overall framing bias score 0-1 (0 = neutral, 1 = heavily framed) */
  readonly framingBias: number;
}

// Keyword sets per frame type
const FRAME_KEYWORDS: Record<FrameType, ReadonlyArray<string>> = {
  conflict: [
    "fight", "battle", "war", "clash", "struggle", "oppose", "attack",
    "defend", "rival", "enemy", "defeat", "victory", "confront", "threat",
  ],
  economic: [
    "cost", "price", "market", "economy", "growth", "profit", "loss",
    "trade", "invest", "fund", "budget", "revenue", "debt", "wealth",
  ],
  human_interest: [
    "family", "child", "mother", "father", "story", "life", "community",
    "people", "individual", "personal", "experience", "human", "victim",
  ],
  moral: [
    "right", "wrong", "ethical", "moral", "justice", "fair", "corrupt",
    "integrity", "value", "principle", "duty", "responsibility", "immoral",
  ],
  attribution: [
    "blame", "responsible", "cause", "fault", "accountable", "led to",
    "resulted in", "because", "due to", "triggered", "led", "caused",
  ],
  fear: [
    "danger", "risk", "threat", "crisis", "alarming", "worrying", "scary",
    "terrifying", "devastating", "catastrophic", "emergency", "panic",
  ],
  progress: [
    "advance", "improve", "achieve", "success", "develop", "innovation",
    "breakthrough", "progress", "reform", "solution", "resolve", "gain",
  ],
  loss: [
    "decline", "fall", "drop", "lose", "lost", "diminish", "reduce",
    "collapse", "fail", "setback", "retreat", "worsen", "erode",
  ],
  neutral: [],
};

export interface FramingPort {
  analyze(text: string): Promise<Result<FramingAnalysis>>;
}

export class RuleBasedFramingPort implements FramingPort {
  async analyze(text: string): Promise<Result<FramingAnalysis>> {
    const lower = text.toLowerCase();
    const words = lower.match(/\b\w+\b/g) ?? [];
    const wordCount = Math.max(1, words.length);

    const frameScores = new Map<FrameType, { count: number; terms: string[] }>();

    for (const [frameType, keywords] of Object.entries(FRAME_KEYWORDS) as [FrameType, ReadonlyArray<string>][]) {
      if (frameType === "neutral") continue;
      const found: string[] = [];
      for (const kw of keywords) {
        if (lower.includes(kw)) {
          found.push(kw);
        }
      }
      if (found.length > 0) {
        frameScores.set(frameType, { count: found.length, terms: found });
      }
    }

    if (frameScores.size === 0) {
      return ok({
        dominantFrame: "neutral",
        frames: [{ frameType: "neutral", confidence: 1.0, triggerTerms: [] }],
        hasCompetingFrames: false,
        framingBias: 0,
      });
    }

    const signals: FrameSignal[] = [];
    let maxCount = 0;
    let dominantFrame: FrameType = "neutral";

    for (const [frameType, { count, terms }] of frameScores) {
      const confidence = Math.min(1, count / (wordCount * 0.05 + 1));
      signals.push({ frameType, confidence, triggerTerms: terms });
      if (count > maxCount) {
        maxCount = count;
        dominantFrame = frameType;
      }
    }

    const sorted = [...signals].sort((a, b) => b.confidence - a.confidence);
    const hasCompetingFrames = sorted.length >= 2 &&
      (sorted[1]?.confidence ?? 0) > (sorted[0]?.confidence ?? 0) * 0.6;

    const totalMatches = [...frameScores.values()].reduce((s, v) => s + v.count, 0);
    const framingBias = Math.min(1, totalMatches / (wordCount * 0.1 + 1));

    return ok({
      dominantFrame,
      frames: sorted,
      hasCompetingFrames,
      framingBias,
    });
  }
}

export function createFramingPort(): FramingPort {
  return new RuleBasedFramingPort();
}
