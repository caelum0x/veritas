import Anthropic from '@anthropic-ai/sdk';
import type { Logger } from '@croo-network/sdk';
import {
  CLAIM_ADJUDICATION_JSON_SCHEMA,
  CLAIM_EXTRACTION_JSON_SCHEMA,
  CitationSchema,
  Verdict,
  type Citation,
} from '../verify/schema.js';
import type { ClaimAdjudication, VerifierLLM } from './types.js';

export interface AnthropicVerifierOptions {
  apiKey: string;
  model: string;
  effort: 'low' | 'medium' | 'high' | 'max';
  maxSearches: number;
  logger: Logger;
}

const MAX_PAUSE_CONTINUATIONS = 4;

/**
 * Claude-backed verification brain.
 *
 * Each claim is handled in two phases for robustness:
 *   1. RESEARCH  — Claude with the server-side `web_search` tool gathers live
 *                  evidence and synthesises findings + sources.
 *   2. ADJUDICATE — a second, tool-free call with structured-output
 *                  constraints turns that evidence into a typed verdict.
 *
 * Splitting the phases keeps the evidence-gathering free to roam while keeping
 * the final verdict strictly schema-valid and parseable.
 */
export function createAnthropicVerifier(opts: AnthropicVerifierOptions): VerifierLLM {
  const client = new Anthropic({ apiKey: opts.apiKey });
  const { model, effort, maxSearches, logger } = opts;

  return {
    async extractClaims(text, context) {
      const sys =
        'You extract discrete, independently checkable factual claims from text. ' +
        'Return only objective, verifiable assertions (skip opinions, questions, ' +
        'and pure rhetoric). Split compound sentences into atomic claims. ' +
        'Preserve enough context in each claim that it stands alone.';
      const user =
        (context ? `Context: ${context}\n\n` : '') +
        `Extract the factual claims from the following text:\n\n${text}`;

      const json = await structuredCall(client, {
        model,
        maxTokens: 4000,
        system: sys,
        user,
        schema: CLAIM_EXTRACTION_JSON_SCHEMA,
      });
      const claims = Array.isArray(json?.claims) ? json.claims : [];
      return claims.filter((c: unknown): c is string => typeof c === 'string' && c.trim().length > 0);
    },

    async verifyClaim({ claim, context, allowedDomains }) {
      const evidence = await research(client, {
        model,
        effort,
        maxSearches,
        claim,
        context,
        allowedDomains,
        logger,
      });

      const sys =
        'You are a rigorous fact-checking adjudicator. Given a CLAIM and EVIDENCE ' +
        'gathered from the web, decide a verdict:\n' +
        '- SUPPORTED: evidence clearly substantiates the claim.\n' +
        '- REFUTED: evidence clearly contradicts the claim.\n' +
        '- UNVERIFIABLE: evidence is insufficient, conflicting, or absent.\n' +
        'Be conservative: when in doubt, choose UNVERIFIABLE. Never invent sources. ' +
        'Every citation URL must appear in the EVIDENCE. confidence is your ' +
        'calibrated probability (0..1) that the verdict is correct.';
      const user =
        `CLAIM:\n${claim}\n\n` +
        (context ? `CONTEXT:\n${context}\n\n` : '') +
        `EVIDENCE:\n${evidence || '(no evidence was gathered)'}`;

      const json = await structuredCall(client, {
        model,
        maxTokens: 2000,
        system: sys,
        user,
        schema: CLAIM_ADJUDICATION_JSON_SCHEMA,
      });

      return normaliseAdjudication(json, logger);
    },
  };
}

// --------------------------------------------------------------------------
// Phase 1 — research with the web_search server tool
// --------------------------------------------------------------------------

interface ResearchArgs {
  model: string;
  effort: string;
  maxSearches: number;
  claim: string;
  context?: string;
  allowedDomains?: string[];
  logger: Logger;
}

async function research(client: Anthropic, args: ResearchArgs): Promise<string> {
  const system =
    'You are a meticulous research assistant. Use the web_search tool to find ' +
    'primary, authoritative sources bearing on the given claim — both supporting ' +
    'and contradicting. Then write a concise evidence brief. End your response ' +
    'with a line "SOURCES:" followed by one bullet per source as ' +
    '"<url> — <short verbatim quote that bears on the claim>". Only list sources ' +
    'you actually consulted. Do not state a verdict; just lay out the evidence.';

  const webSearchTool: Record<string, unknown> = {
    type: 'web_search_20260209',
    name: 'web_search',
    max_uses: args.maxSearches,
  };
  if (args.allowedDomains && args.allowedDomains.length > 0) {
    webSearchTool.allowed_domains = args.allowedDomains;
  }

  const messages: Array<{ role: 'user' | 'assistant'; content: unknown }> = [
    {
      role: 'user',
      content:
        (args.context ? `Context: ${args.context}\n\n` : '') +
        `Research this claim and gather evidence:\n\n${args.claim}`,
    },
  ];

  let lastText = '';
  for (let i = 0; i <= MAX_PAUSE_CONTINUATIONS; i++) {
    const response = await createMessage(client, {
      model: args.model,
      max_tokens: 6000,
      thinking: { type: 'adaptive' },
      output_config: { effort: args.effort },
      tools: [webSearchTool],
      system,
      messages,
    });

    lastText = extractText(response);

    if (response.stop_reason === 'pause_turn') {
      // Server-side tool loop hit its iteration cap — resume by echoing content.
      messages.push({ role: 'assistant', content: response.content });
      continue;
    }
    break;
  }

  const searchUrls = collectSearchUrls(client, lastText); // currently text-derived; see note
  if (searchUrls.length > 0) {
    args.logger.debug('research gathered sources', { count: searchUrls.length });
  }
  return lastText;
}

// --------------------------------------------------------------------------
// Phase 2 — structured adjudication / extraction
// --------------------------------------------------------------------------

interface StructuredArgs {
  model: string;
  maxTokens: number;
  system: string;
  user: string;
  schema: unknown;
}

async function structuredCall(
  client: Anthropic,
  args: StructuredArgs,
): Promise<Record<string, any>> {
  const response = await createMessage(client, {
    model: args.model,
    max_tokens: args.maxTokens,
    system: args.system,
    messages: [{ role: 'user', content: args.user }],
    output_config: { format: { type: 'json_schema', schema: args.schema } },
  });
  const text = extractText(response);
  try {
    return JSON.parse(text);
  } catch {
    // Structured outputs guarantee valid JSON, but guard defensively: try to
    // recover the first JSON object in the text.
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        /* fall through */
      }
    }
    throw new Error('Model did not return parseable JSON');
  }
}

function normaliseAdjudication(json: Record<string, any>, logger: Logger): ClaimAdjudication {
  const rawVerdict = String(json?.verdict ?? '').toUpperCase();
  const verdict: Verdict =
    rawVerdict === Verdict.Supported
      ? Verdict.Supported
      : rawVerdict === Verdict.Refuted
        ? Verdict.Refuted
        : Verdict.Unverifiable;

  let confidence = Number(json?.confidence);
  if (!Number.isFinite(confidence)) confidence = 0;
  confidence = Math.min(1, Math.max(0, confidence));

  const citations: Citation[] = [];
  if (Array.isArray(json?.citations)) {
    for (const raw of json.citations) {
      const parsed = CitationSchema.safeParse(raw);
      if (parsed.success && parsed.data.url) citations.push(parsed.data);
    }
  }

  // A verdict with no supporting source cannot be SUPPORTED/REFUTED — downgrade.
  let finalVerdict = verdict;
  if (finalVerdict !== Verdict.Unverifiable && citations.length === 0) {
    logger.warn('downgrading uncited verdict to UNVERIFIABLE', { verdict });
    finalVerdict = Verdict.Unverifiable;
    confidence = Math.min(confidence, 0.4);
  }

  return {
    verdict: finalVerdict,
    confidence,
    reasoning: typeof json?.reasoning === 'string' ? json.reasoning : '',
    citations,
  };
}

// --------------------------------------------------------------------------
// SDK plumbing
// --------------------------------------------------------------------------

/**
 * The pinned `@anthropic-ai/sdk` typings may predate `output_config` and the
 * `web_search_20260209` tool variant. We construct the documented request shape
 * and cast at the single call boundary, keeping the rest of the file typed.
 */
function createMessage(client: Anthropic, params: Record<string, unknown>): Promise<Anthropic.Message> {
  return client.messages.create(params as unknown as Anthropic.MessageCreateParamsNonStreaming) as Promise<Anthropic.Message>;
}

function extractText(message: Anthropic.Message): string {
  const parts: string[] = [];
  for (const block of message.content) {
    if (block.type === 'text') parts.push(block.text);
  }
  return parts.join('\n').trim();
}

/**
 * Best-effort extraction of source URLs from the research brief text. The
 * adjudicator is the authoritative source of citations; this only feeds debug
 * telemetry, so a simple URL scan of the brief is sufficient.
 */
function collectSearchUrls(_client: Anthropic, text: string): string[] {
  const urls = new Set<string>();
  const re = /\bhttps?:\/\/[^\s)>\]]+/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) urls.add(m[0]);
  return [...urls];
}
