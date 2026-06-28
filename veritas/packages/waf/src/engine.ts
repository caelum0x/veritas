// WAF engine: evaluate requests against rulesets, signatures, and IP reputation
import { type Logger, noopLogger } from "@veritas/observability";
import { type Rule, evaluateRule } from "./rule.js";
import { type Ruleset, mergeRulesets } from "./ruleset.js";
import { testSignatures, type SignatureCategory } from "./signatures.js";
import {
  type IpReputationProvider,
  createIpReputationProvider,
  isThreatIp,
} from "./ip-reputation.js";
import { type WafRequest, type WafDecision, type DecisionOutcome } from "./types.js";

export interface EngineOptions {
  rulesets?: readonly Ruleset[];
  enableSignatureDetection?: boolean;
  signatureCategories?: readonly SignatureCategory[];
  enableIpReputation?: boolean;
  ipReputationThreshold?: number;
  ipReputationProvider?: IpReputationProvider;
  logger?: Logger;
}

function buildDecision(
  outcome: DecisionOutcome,
  ruleId: string | undefined,
  reason: string,
  startMs: number,
): WafDecision {
  return {
    outcome,
    ruleId,
    reason,
    latencyMs: Date.now() - startMs,
    metadata: {},
  };
}

export class WafEngine {
  private readonly rulesets: readonly Ruleset[];
  private readonly enableSignatureDetection: boolean;
  private readonly signatureCategories: readonly SignatureCategory[] | undefined;
  private readonly enableIpReputation: boolean;
  private readonly ipReputationThreshold: number;
  private readonly ipReputationProvider: IpReputationProvider;
  private readonly logger: Logger;

  constructor(options: EngineOptions = {}) {
    this.rulesets = options.rulesets ?? [];
    this.enableSignatureDetection = options.enableSignatureDetection ?? true;
    this.signatureCategories = options.signatureCategories;
    this.enableIpReputation = options.enableIpReputation ?? true;
    this.ipReputationThreshold = options.ipReputationThreshold ?? 60;
    this.ipReputationProvider =
      options.ipReputationProvider ?? createIpReputationProvider();
    this.logger = options.logger ?? noopLogger;
  }

  async evaluate(request: WafRequest): Promise<WafDecision> {
    const startMs = Date.now();
    const requestRecord = requestToRecord(request);

    // 1. IP reputation check
    if (this.enableIpReputation && request.ip) {
      const score = await this.ipReputationProvider.lookup(request.ip);
      if (isThreatIp(score, this.ipReputationThreshold)) {
        this.logger.warn("WAF: IP reputation block", {
          ip: request.ip,
          score: score.score,
          categories: score.categories,
        });
        return buildDecision(
          "block",
          "ip-reputation",
          `IP reputation score ${score.score} (categories: ${score.categories.join(", ")})`,
          startMs,
        );
      }
    }

    // 2. Signature detection on URI, body, and query string
    if (this.enableSignatureDetection) {
      const fieldsToScan = [request.uri, request.body, request.query].filter(
        (v): v is string => typeof v === "string" && v.length > 0,
      );
      for (const field of fieldsToScan) {
        const match = testSignatures(field, this.signatureCategories as SignatureCategory[] | undefined);
        if (match) {
          this.logger.warn("WAF: Signature match block", {
            signatureId: match.id,
            category: match.category,
            severity: match.severity,
          });
          return buildDecision(
            "block",
            match.id,
            `Signature match: ${match.id} (${match.name})`,
            startMs,
          );
        }
      }
    }

    // 3. Ruleset evaluation (ordered by priority)
    const rules = mergeRulesets(...this.rulesets);
    for (const rule of rules) {
      const matched = evaluateRule(rule, requestRecord);
      if (matched) {
        this.logger.info("WAF: Rule matched", { ruleId: rule.id, action: rule.action });
        return buildDecision(rule.action, rule.id, `Rule match: ${rule.id} (${rule.name})`, startMs);
      }
    }

    return buildDecision("allow", undefined, "No rules matched", startMs);
  }

  withRuleset(ruleset: Ruleset): WafEngine {
    return new WafEngine({
      rulesets: [...this.rulesets, ruleset],
      enableSignatureDetection: this.enableSignatureDetection,
      signatureCategories: this.signatureCategories as SignatureCategory[],
      enableIpReputation: this.enableIpReputation,
      ipReputationThreshold: this.ipReputationThreshold,
      ipReputationProvider: this.ipReputationProvider,
      logger: this.logger,
    });
  }

  getEnabledRules(): readonly Rule[] {
    return mergeRulesets(...this.rulesets);
  }
}

function requestToRecord(request: WafRequest): Record<string, unknown> {
  return {
    ip: request.ip,
    uri: request.uri,
    method: request.method,
    body: request.body,
    geo: request.geo,
    headers: request.headers,
    query: request.query,
  };
}
