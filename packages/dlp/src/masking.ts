// Masking strategies for PII: redact, partial, hash, tokenize
import { sha256Hex } from "@veritas/core";
import type { FindingType } from "./finding.js";

export type MaskStrategy = "REDACT" | "PARTIAL" | "HASH" | "TOKENIZE";

export interface MaskOptions {
  readonly strategy: MaskStrategy;
  readonly visiblePrefix?: number;
  readonly visibleSuffix?: number;
  readonly placeholder?: string;
}

const DEFAULT_PLACEHOLDER = "[REDACTED]";

export function maskValue(
  value: string,
  options: MaskOptions,
): string {
  switch (options.strategy) {
    case "REDACT":
      return options.placeholder ?? DEFAULT_PLACEHOLDER;

    case "PARTIAL": {
      const prefix = options.visiblePrefix ?? 0;
      const suffix = options.visibleSuffix ?? 0;
      if (prefix + suffix >= value.length) {
        return options.placeholder ?? DEFAULT_PLACEHOLDER;
      }
      const start = value.slice(0, prefix);
      const end = suffix > 0 ? value.slice(-suffix) : "";
      const stars = "*".repeat(Math.max(1, value.length - prefix - suffix));
      return `${start}${stars}${end}`;
    }

    case "HASH":
      return `[HASH:${sha256Hex(value).slice(0, 16)}]`;

    case "TOKENIZE": {
      const token = sha256Hex(`token:${value}`).slice(0, 12);
      return `[TOKEN:${token}]`;
    }

    default:
      return DEFAULT_PLACEHOLDER;
  }
}

export function defaultStrategyFor(type: FindingType): MaskOptions {
  switch (type) {
    case "EMAIL":
      return { strategy: "PARTIAL", visiblePrefix: 2, visibleSuffix: 0 };
    case "SSN":
      return { strategy: "PARTIAL", visiblePrefix: 0, visibleSuffix: 4 };
    case "CREDIT_CARD":
      return { strategy: "PARTIAL", visiblePrefix: 0, visibleSuffix: 4 };
    case "PHONE":
      return { strategy: "PARTIAL", visiblePrefix: 0, visibleSuffix: 4 };
    case "SECRET_ENTROPY":
      return { strategy: "REDACT" };
    case "CUSTOM":
      return { strategy: "REDACT" };
    default:
      return { strategy: "REDACT" };
  }
}
