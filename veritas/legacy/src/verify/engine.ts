import type { Logger } from '@croo-network/sdk';
import { VERITAS_VERSION } from '../config.js';
import type { VerifierLLM } from '../llm/types.js';
import {
  computeTrustScore,
  contentHash,
  countSources,
  countVerdicts,
} from './provenance.js';
import {
  VerificationReportSchema,
  Verdict,
  type ClaimVerdict,
  type VerificationReport,
  type VerificationRequest,
} from './schema.js';

export interface EngineOptions {
  llm: VerifierLLM;
  logger: Logger;
  model: string;
  effort: string;
  maxClaims: number;
  concurrency: number;
  /** Injected clock so the report timestamp is testable/deterministic. */
  now?: () => Date;
}

/**
 * Runs a full verification job: resolve the claim list, adjudicate each claim
 * (bounded concurrency), then assemble a signed, hash-anchored report.
 */
export async function runVerification(
  request: VerificationRequest,
  opts: EngineOptions,
): Promise<VerificationReport> {
  const now = opts.now ?? (() => new Date());
  const allClaims = await resolveClaims(request, opts);

  const skipped = Math.max(0, allClaims.length - opts.maxClaims);
  const claimsToCheck = allClaims.slice(0, opts.maxClaims);
  if (skipped > 0) {
    opts.logger.warn('claim count exceeds max; remainder skipped', {
      total: allClaims.length,
      max: opts.maxClaims,
      skipped,
    });
  }

  const verdicts = await mapWithConcurrency(
    claimsToCheck,
    opts.concurrency,
    async (claim): Promise<ClaimVerdict> => {
      try {
        const a = await opts.llm.verifyClaim({
          claim,
          context: request.context,
          allowedDomains: request.options?.allowedDomains,
        });
        return { claim, ...a };
      } catch (err) {
        opts.logger.error('claim verification failed', {
          claim,
          error: err instanceof Error ? err.message : String(err),
        });
        return {
          claim,
          verdict: Verdict.Unverifiable,
          confidence: 0,
          reasoning: 'Verification failed due to an internal error.',
          citations: [],
        };
      }
    },
  );

  const counts = countVerdicts(verdicts);
  const trustScore = computeTrustScore(verdicts);
  const sourceCount = countSources(verdicts);
  const createdAt = now().toISOString();

  // The hash commits to inputs + verdicts. createdAt is deliberately EXCLUDED
  // so the same evidence yields a stable, reproducible anchor; the timestamp is
  // recorded alongside but is not part of the commitment.
  const hash = contentHash({ request, claims: verdicts });

  const report: VerificationReport = {
    schema: 'veritas.report.v1',
    summary: buildSummary(counts, skipped, trustScore),
    trustScore,
    counts: { ...counts, skipped },
    claims: verdicts,
    provenance: {
      contentHash: hash,
      verifier: 'veritas',
      verifierVersion: VERITAS_VERSION,
      model: opts.model,
      effort: opts.effort,
      createdAt,
      claimCount: verdicts.length,
      sourceCount,
    },
  };

  // Validate our own output before it leaves the building.
  return VerificationReportSchema.parse(report);
}

async function resolveClaims(
  request: VerificationRequest,
  opts: EngineOptions,
): Promise<string[]> {
  if (request.claims && request.claims.length > 0) return request.claims;
  if (request.text) {
    const extracted = await opts.llm.extractClaims(request.text, request.context);
    opts.logger.info('extracted claims from text', { count: extracted.length });
    return extracted;
  }
  return [];
}

function buildSummary(
  counts: { supported: number; refuted: number; unverifiable: number },
  skipped: number,
  trustScore: number,
): string {
  const total = counts.supported + counts.refuted + counts.unverifiable;
  const parts = [
    `Checked ${total} claim${total === 1 ? '' : 's'}: `,
    `${counts.supported} supported, ${counts.refuted} refuted, ${counts.unverifiable} unverifiable`,
    skipped > 0 ? ` (${skipped} skipped over the per-job limit)` : '',
    `. Aggregate trust score: ${trustScore}/100.`,
  ];
  return parts.join('');
}

/** Run `fn` over `items` with at most `limit` in flight, preserving order. */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i] as T, i);
    }
  });
  await Promise.all(workers);
  return results;
}
