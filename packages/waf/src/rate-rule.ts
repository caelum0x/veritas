// Rate-limiting rules: token-bucket per IP with configurable thresholds and windows
import { z } from "zod";

export const RateRuleSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  enabled: z.boolean().default(true),
  requestsPerWindow: z.number().int().positive(),
  windowMs: z.number().int().positive(),
  burstAllowance: z.number().int().min(0).default(0),
  action: z.enum(["block", "challenge", "log"]).default("block"),
});
export type RateRule = z.infer<typeof RateRuleSchema>;

interface BucketState {
  readonly tokens: number;
  readonly lastRefillAt: number;
}

// In-memory token bucket store keyed by "<ruleId>:<ip>"
const bucketStore = new Map<string, BucketState>();

function refillTokens(state: BucketState, rule: RateRule, now: number): BucketState {
  const elapsed = now - state.lastRefillAt;
  const refillRate = rule.requestsPerWindow / rule.windowMs;
  const refilled = elapsed * refillRate;
  const capacity = rule.requestsPerWindow + rule.burstAllowance;
  return {
    tokens: Math.min(capacity, state.tokens + refilled),
    lastRefillAt: now,
  };
}

export function consumeToken(rule: RateRule, ip: string, now = Date.now()): boolean {
  if (!rule.enabled) return true;

  const key = `${rule.id}:${ip}`;
  const capacity = rule.requestsPerWindow + rule.burstAllowance;
  const existing = bucketStore.get(key) ?? { tokens: capacity, lastRefillAt: now };
  const refilled = refillTokens(existing, rule, now);

  if (refilled.tokens < 1) {
    bucketStore.set(key, { ...refilled, lastRefillAt: now });
    return false;
  }

  bucketStore.set(key, { tokens: refilled.tokens - 1, lastRefillAt: now });
  return true;
}

export function getRemainingTokens(rule: RateRule, ip: string, now = Date.now()): number {
  const key = `${rule.id}:${ip}`;
  const capacity = rule.requestsPerWindow + rule.burstAllowance;
  const existing = bucketStore.get(key) ?? { tokens: capacity, lastRefillAt: now };
  const refilled = refillTokens(existing, rule, now);
  return Math.floor(refilled.tokens);
}

export function resetBucket(rule: RateRule, ip: string): void {
  const key = `${rule.id}:${ip}`;
  bucketStore.delete(key);
}

export function makeRateRule(input: Omit<RateRule, never>): RateRule {
  return RateRuleSchema.parse(input);
}

export const DEFAULT_RATE_RULE: RateRule = makeRateRule({
  id: "default-rate-limit",
  name: "Default Rate Limit",
  enabled: true,
  requestsPerWindow: 100,
  windowMs: 60_000,
  burstAllowance: 20,
  action: "block",
});
