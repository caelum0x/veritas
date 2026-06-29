import { z } from 'zod';

/**
 * The public, on-chain-callable contract for the Veritas service.
 *
 * INPUT  (`requirements` field of a CAP negotiation) -> VerificationRequest
 * OUTPUT (`deliverableSchema` field of a CAP delivery) -> VerificationReport
 *
 * Both are validated at the trust boundary. Any agent — in any framework — that
 * can produce this JSON can hire Veritas; any agent that can read this JSON can
 * consume its verdicts. This is the whole A2A interface.
 */

// --------------------------------------------------------------------------
// Input
// --------------------------------------------------------------------------

export const VerificationRequestSchema = z
  .object({
    /** Discrete claims to verify, each a self-contained factual statement. */
    claims: z.array(z.string().min(1).max(2000)).max(100).optional(),
    /**
     * A block of generated text whose factual claims should be extracted and
     * verified. Use this when you have an LLM output and want it fact-checked.
     */
    text: z.string().min(1).max(50_000).optional(),
    /** Optional context to disambiguate claims (domain, time frame, subject). */
    context: z.string().max(10_000).optional(),
    options: z
      .object({
        /** Restrict evidence gathering to these domains, if provided. */
        allowedDomains: z.array(z.string().min(1)).max(50).optional(),
      })
      .strict()
      .optional(),
  })
  .strict()
  .refine(
    (v) => (v.claims && v.claims.length > 0) || (v.text && v.text.trim().length > 0),
    { message: 'Provide either a non-empty `claims` array or a non-empty `text` field.' },
  );

export type VerificationRequest = z.infer<typeof VerificationRequestSchema>;

// --------------------------------------------------------------------------
// Output
// --------------------------------------------------------------------------

export const Verdict = {
  Supported: 'SUPPORTED',
  Refuted: 'REFUTED',
  Unverifiable: 'UNVERIFIABLE',
} as const;
export type Verdict = (typeof Verdict)[keyof typeof Verdict];

export const CitationSchema = z.object({
  url: z.string(),
  title: z.string().default(''),
  /** Verbatim supporting (or refuting) snippet from the source. */
  quote: z.string().default(''),
});
export type Citation = z.infer<typeof CitationSchema>;

export const ClaimVerdictSchema = z.object({
  claim: z.string(),
  verdict: z.nativeEnum(Verdict),
  /** Calibrated 0..1 confidence in the verdict. */
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  citations: z.array(CitationSchema),
});
export type ClaimVerdict = z.infer<typeof ClaimVerdictSchema>;

export const ProvenanceSchema = z.object({
  /** SHA-256 over the canonicalised { request, claims } — the tamper-evident anchor. */
  contentHash: z.string(),
  verifier: z.string(),
  verifierVersion: z.string(),
  model: z.string(),
  effort: z.string(),
  createdAt: z.string(),
  claimCount: z.number().int(),
  sourceCount: z.number().int(),
});
export type Provenance = z.infer<typeof ProvenanceSchema>;

export const VerificationReportSchema = z.object({
  schema: z.literal('veritas.report.v1'),
  summary: z.string(),
  /** 0..100 aggregate trust score (confidence-weighted across claims). */
  trustScore: z.number().min(0).max(100),
  counts: z.object({
    supported: z.number().int(),
    refuted: z.number().int(),
    unverifiable: z.number().int(),
    skipped: z.number().int(),
  }),
  claims: z.array(ClaimVerdictSchema),
  provenance: ProvenanceSchema,
});
export type VerificationReport = z.infer<typeof VerificationReportSchema>;

/**
 * JSON Schema describing a single adjudicated claim, for use with the Anthropic
 * `output_config.format` structured-output constraint. Kept in sync with
 * {@link ClaimVerdictSchema} but hand-written because Anthropic structured
 * outputs do not accept all JSON-Schema keywords (no min/maxLength etc).
 */
export const CLAIM_ADJUDICATION_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    verdict: { type: 'string', enum: ['SUPPORTED', 'REFUTED', 'UNVERIFIABLE'] },
    confidence: { type: 'number' },
    reasoning: { type: 'string' },
    citations: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          url: { type: 'string' },
          title: { type: 'string' },
          quote: { type: 'string' },
        },
        required: ['url', 'title', 'quote'],
      },
    },
  },
  required: ['verdict', 'confidence', 'reasoning', 'citations'],
} as const;

export const CLAIM_EXTRACTION_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    claims: { type: 'array', items: { type: 'string' } },
  },
  required: ['claims'],
} as const;
