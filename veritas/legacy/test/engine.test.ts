import { describe, expect, it, vi } from 'vitest';
import { runVerification, type EngineOptions } from '../src/verify/engine.js';
import type { VerifierLLM } from '../src/llm/types.js';
import { Verdict } from '../src/verify/schema.js';
import { createLogger } from '../src/logger.js';

const silentLogger = createLogger('error');

function fakeLLM(overrides: Partial<VerifierLLM> = {}): VerifierLLM {
  return {
    extractClaims: async () => ['extracted claim 1', 'extracted claim 2'],
    verifyClaim: async ({ claim }) => ({
      verdict: Verdict.Supported,
      confidence: 0.9,
      reasoning: `verified: ${claim}`,
      citations: [{ url: 'https://example.com', title: 'Example', quote: 'q' }],
    }),
    ...overrides,
  };
}

function baseEngine(llm: VerifierLLM, extra: Partial<EngineOptions> = {}): EngineOptions {
  return {
    llm,
    logger: silentLogger,
    model: 'claude-opus-4-8',
    effort: 'high',
    maxClaims: 20,
    concurrency: 4,
    now: () => new Date('2026-06-27T00:00:00.000Z'),
    ...extra,
  };
}

describe('runVerification', () => {
  it('verifies an explicit claims list and assembles a valid report', async () => {
    const report = await runVerification(
      { claims: ['claim a', 'claim b'] },
      baseEngine(fakeLLM()),
    );

    expect(report.schema).toBe('veritas.report.v1');
    expect(report.claims).toHaveLength(2);
    expect(report.counts.supported).toBe(2);
    expect(report.trustScore).toBe(100);
    expect(report.provenance.contentHash).toMatch(/^sha256:/);
    expect(report.provenance.model).toBe('claude-opus-4-8');
    expect(report.provenance.createdAt).toBe('2026-06-27T00:00:00.000Z');
    expect(report.provenance.sourceCount).toBe(1);
  });

  it('extracts claims from a text block when no claims are given', async () => {
    const llm = fakeLLM();
    const spy = vi.spyOn(llm, 'extractClaims');
    const report = await runVerification({ text: 'a paragraph of output' }, baseEngine(llm));
    expect(spy).toHaveBeenCalledOnce();
    expect(report.claims).toHaveLength(2);
  });

  it('caps claims at maxClaims and records the rest as skipped', async () => {
    const report = await runVerification(
      { claims: ['1', '2', '3', '4', '5'] },
      baseEngine(fakeLLM(), { maxClaims: 2 }),
    );
    expect(report.claims).toHaveLength(2);
    expect(report.counts.skipped).toBe(3);
    expect(report.summary).toContain('skipped');
  });

  it('isolates per-claim failures as UNVERIFIABLE without failing the job', async () => {
    const llm = fakeLLM({
      verifyClaim: async ({ claim }) => {
        if (claim === 'boom') throw new Error('upstream timeout');
        return {
          verdict: Verdict.Refuted,
          confidence: 0.8,
          reasoning: 'r',
          citations: [{ url: 'https://x.com', title: '', quote: '' }],
        };
      },
    });
    const report = await runVerification({ claims: ['ok', 'boom'] }, baseEngine(llm));
    expect(report.claims).toHaveLength(2);
    const boom = report.claims.find((c) => c.claim === 'boom');
    expect(boom?.verdict).toBe(Verdict.Unverifiable);
    expect(boom?.confidence).toBe(0);
  });

  it('produces a reproducible content hash for identical inputs/verdicts', async () => {
    const a = await runVerification({ claims: ['c'] }, baseEngine(fakeLLM()));
    const b = await runVerification(
      { claims: ['c'] },
      baseEngine(fakeLLM(), { now: () => new Date('2030-01-01T00:00:00.000Z') }),
    );
    // Different timestamps, identical evidence -> identical commitment.
    expect(a.provenance.contentHash).toBe(b.provenance.contentHash);
    expect(a.provenance.createdAt).not.toBe(b.provenance.createdAt);
  });
});
