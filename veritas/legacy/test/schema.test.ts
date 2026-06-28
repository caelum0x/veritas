import { describe, expect, it } from 'vitest';
import { VerificationRequestSchema } from '../src/verify/schema.js';
import { parseRequest } from '../src/croo/provider.js';

describe('VerificationRequestSchema', () => {
  it('accepts a claims array', () => {
    const r = VerificationRequestSchema.safeParse({ claims: ['a', 'b'] });
    expect(r.success).toBe(true);
  });

  it('accepts a text block', () => {
    const r = VerificationRequestSchema.safeParse({ text: 'some generated output' });
    expect(r.success).toBe(true);
  });

  it('rejects an empty request', () => {
    expect(VerificationRequestSchema.safeParse({}).success).toBe(false);
    expect(VerificationRequestSchema.safeParse({ claims: [] }).success).toBe(false);
  });

  it('rejects unknown top-level keys (strict)', () => {
    const r = VerificationRequestSchema.safeParse({ claims: ['a'], evil: true });
    expect(r.success).toBe(false);
  });
});

describe('parseRequest', () => {
  it('parses valid JSON requirements', () => {
    const out = parseRequest(JSON.stringify({ claims: ['a'] }));
    expect(out.ok).toBe(true);
  });

  it('reports invalid JSON', () => {
    const out = parseRequest('not json');
    expect(out).toEqual({ ok: false, error: 'requirements must be valid JSON' });
  });

  it('reports schema violations with a readable message', () => {
    const out = parseRequest(JSON.stringify({}));
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.error).toContain('invalid requirements');
  });
});
