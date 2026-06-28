import { describe, expect, it } from 'vitest';
import {
  canonicalize,
  computeTrustScore,
  contentHash,
  countSources,
  countVerdicts,
} from '../src/verify/provenance.js';
import { Verdict, type ClaimVerdict } from '../src/verify/schema.js';

const claim = (
  verdict: Verdict,
  confidence: number,
  urls: string[] = [],
): ClaimVerdict => ({
  claim: 'x',
  verdict,
  confidence,
  reasoning: '',
  citations: urls.map((url) => ({ url, title: '', quote: '' })),
});

describe('canonicalize', () => {
  it('is independent of key insertion order', () => {
    expect(canonicalize({ b: 1, a: 2 })).toBe(canonicalize({ a: 2, b: 1 }));
  });

  it('recurses into nested objects and arrays', () => {
    const a = { x: [{ q: 1, p: 2 }], y: { d: 4, c: 3 } };
    const b = { y: { c: 3, d: 4 }, x: [{ p: 2, q: 1 }] };
    expect(canonicalize(a)).toBe(canonicalize(b));
  });
});

describe('contentHash', () => {
  it('is deterministic and order-independent', () => {
    const h1 = contentHash({ a: 1, b: [2, 3] });
    const h2 = contentHash({ b: [2, 3], a: 1 });
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it('changes when content changes', () => {
    expect(contentHash({ a: 1 })).not.toBe(contentHash({ a: 2 }));
  });
});

describe('computeTrustScore', () => {
  it('returns neutral 50 for no claims', () => {
    expect(computeTrustScore([])).toBe(50);
  });

  it('scores all-supported high and all-refuted low', () => {
    expect(computeTrustScore([claim(Verdict.Supported, 1)])).toBe(100);
    expect(computeTrustScore([claim(Verdict.Refuted, 1)])).toBe(0);
  });

  it('treats unverifiable as neutral', () => {
    expect(computeTrustScore([claim(Verdict.Unverifiable, 1)])).toBe(50);
  });

  it('weights by confidence', () => {
    const score = computeTrustScore([
      claim(Verdict.Supported, 1),
      claim(Verdict.Refuted, 0.1),
    ]);
    // High-confidence support dominates a low-confidence refutation.
    expect(score).toBeGreaterThan(80);
  });
});

describe('counts', () => {
  it('tallies verdicts', () => {
    const out = countVerdicts([
      claim(Verdict.Supported, 1),
      claim(Verdict.Supported, 1),
      claim(Verdict.Refuted, 1),
      claim(Verdict.Unverifiable, 1),
    ]);
    expect(out).toEqual({ supported: 2, refuted: 1, unverifiable: 1 });
  });

  it('counts unique source urls', () => {
    const out = countSources([
      claim(Verdict.Supported, 1, ['https://a.com', 'https://b.com']),
      claim(Verdict.Supported, 1, ['https://a.com']),
    ]);
    expect(out).toBe(2);
  });
});
