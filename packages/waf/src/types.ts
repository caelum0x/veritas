// Shared WAF types: request context, evaluation result, and configuration interfaces
import { z } from "zod";

export const HttpMethodSchema = z.enum([
  "GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS", "TRACE",
]);
export type HttpMethod = z.infer<typeof HttpMethodSchema>;

export const WafRequestSchema = z.object({
  ip: z.string().min(1),
  method: z.string().min(1),
  uri: z.string().min(1),
  query: z.string().default(""),
  headers: z.record(z.string()).default({}),
  body: z.string().default(""),
  geo: z.string().default(""),
  timestamp: z.number().default(() => Date.now()),
  requestId: z.string().optional(),
});
export type WafRequest = z.infer<typeof WafRequestSchema>;

export type DecisionOutcome = "allow" | "block" | "challenge" | "log";

export interface WafDecision {
  readonly outcome: DecisionOutcome;
  readonly ruleId: string | undefined;
  readonly reason: string;
  readonly latencyMs: number;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export const WafConfigSchema = z.object({
  enabled: z.boolean().default(true),
  defaultDecision: z.enum(["allow", "block", "challenge", "log"]).default("allow"),
  maxBodyBytes: z.number().int().positive().default(1_048_576),
  inspectBody: z.boolean().default(true),
  inspectHeaders: z.boolean().default(true),
  inspectQuery: z.boolean().default(true),
  signatureCategories: z
    .array(z.enum(["sqli", "xss", "path-traversal", "command-injection", "ssrf"]))
    .default(["sqli", "xss", "path-traversal", "command-injection", "ssrf"]),
  blockOnSignatureMatch: z.boolean().default(true),
});
export type WafConfig = z.infer<typeof WafConfigSchema>;

export const GeoRuleSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  countryCodes: z.array(z.string().length(2)),
  action: z.enum(["allow", "block", "challenge", "log"]),
  enabled: z.boolean().default(true),
});
export type GeoRule = z.infer<typeof GeoRuleSchema>;

export const IpReputationEntrySchema = z.object({
  ip: z.string().min(1),
  score: z.number().min(0).max(100),
  tags: z.array(z.string()).default([]),
  addedAt: z.string(),
  expiresAt: z.string().optional(),
});
export type IpReputationEntry = z.infer<typeof IpReputationEntrySchema>;

export const RateRuleSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  key: z.enum(["ip", "uri", "method"]),
  limit: z.number().int().positive(),
  windowMs: z.number().int().positive(),
  action: z.enum(["allow", "block", "challenge", "log"]),
  enabled: z.boolean().default(true),
});
export type RateRule = z.infer<typeof RateRuleSchema>;

export interface WafMiddlewareOptions {
  readonly config?: Partial<WafConfig>;
  readonly onBlock?: (req: WafRequest, decision: WafDecision) => void;
  readonly onChallenge?: (req: WafRequest, decision: WafDecision) => void;
  readonly onAllow?: (req: WafRequest, decision: WafDecision) => void;
}
