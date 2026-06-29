// source-diversity gate: ensures the report references a minimum number of distinct source domains.

import { ok } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { QualityGate, GateInput } from "../gate.js";
import { passed, failed } from "../result.js";
import type { GateResult, GateFinding } from "../result.js";
import type { Severity } from "../severity.js";
import { z } from "zod";

const GATE_ID = "source-diversity";

const sourceShape = z.object({
  domain: z.string().min(1),
});

const citationShape = z.object({
  url: z.string().url(),
});

/** Extract the registrable domain (e.g. "example.com") from a URL string. */
function extractDomain(url: string): string {
  try {
    const { hostname } = new URL(url);
    const parts = hostname.split(".");
    return parts.length >= 2 ? parts.slice(-2).join(".") : hostname;
  } catch {
    return url;
  }
}

export function createSourceDiversityGate(options: {
  minDomains?: number;
  failOn?: Severity;
} = {}): QualityGate {
  const minDomains = options.minDomains ?? 2;

  return {
    id: GATE_ID,
    name: "Source Diversity",
    failOn: options.failOn ?? "error",

    async evaluate(input: GateInput): Promise<Result<GateResult>> {
      const findings: GateFinding[] = [];
      const domains = new Set<string>();

      // Collect domains from structured source objects.
      for (const raw of input.sources) {
        const parsed = sourceShape.safeParse(raw);
        if (parsed.success && parsed.data.domain.length > 0) {
          domains.add(parsed.data.domain.toLowerCase());
        }
      }

      // Fall back to deriving domains from citation URLs when no source objects exist.
      if (domains.size === 0) {
        for (const raw of input.citations) {
          const parsed = citationShape.safeParse(raw);
          if (parsed.success) {
            domains.add(extractDomain(parsed.data.url));
          }
        }
      }

      const uniqueDomainCount = domains.size;

      if (uniqueDomainCount < minDomains) {
        findings.push({
          code: "source-diversity.insufficient",
          message: `Report references ${uniqueDomainCount} unique domain(s) but at least ${minDomains} are required.`,
          severity: "error",
          path: "sources",
        });
      }

      if (findings.length === 0) {
        return ok(passed(GATE_ID, uniqueDomainCount));
      }
      return ok(failed(GATE_ID, findings, uniqueDomainCount));
    },
  };
}
