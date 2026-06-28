// Attack signatures for SQL injection and XSS detection patterns
import { type RuleCondition } from "./rule.js";

export type SignatureCategory = "sqli" | "xss" | "path-traversal" | "command-injection" | "ssrf";

export interface AttackSignature {
  readonly id: string;
  readonly category: SignatureCategory;
  readonly name: string;
  readonly severity: "low" | "medium" | "high" | "critical";
  readonly pattern: RegExp;
  readonly description: string;
}

const SQLI_SIGNATURES: readonly AttackSignature[] = [
  {
    id: "sqli-001",
    category: "sqli",
    name: "Basic SQL Injection",
    severity: "critical",
    pattern: /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b.*\b(FROM|INTO|WHERE|TABLE)\b)/i,
    description: "Detects basic SQL keyword sequences",
  },
  {
    id: "sqli-002",
    category: "sqli",
    name: "SQL Comment Injection",
    severity: "high",
    pattern: /(--|\/\*|\*\/|;--)/,
    description: "Detects SQL comment sequences used to terminate queries",
  },
  {
    id: "sqli-003",
    category: "sqli",
    name: "Boolean-based Blind SQLi",
    severity: "high",
    pattern: /\b(OR|AND)\b\s+[\w'"]+\s*=\s*[\w'"]+/i,
    description: "Detects boolean-based blind SQL injection attempts",
  },
  {
    id: "sqli-004",
    category: "sqli",
    name: "UNION-based SQLi",
    severity: "critical",
    pattern: /\bUNION\b\s+(ALL\s+)?\bSELECT\b/i,
    description: "Detects UNION SELECT statements",
  },
  {
    id: "sqli-005",
    category: "sqli",
    name: "Stacked Queries",
    severity: "critical",
    pattern: /;\s*(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|EXEC)\b/i,
    description: "Detects stacked query attempts",
  },
];

const XSS_SIGNATURES: readonly AttackSignature[] = [
  {
    id: "xss-001",
    category: "xss",
    name: "Script Tag XSS",
    severity: "critical",
    pattern: /<script[\s\S]*?>[\s\S]*?<\/script>/i,
    description: "Detects script tags",
  },
  {
    id: "xss-002",
    category: "xss",
    name: "Event Handler XSS",
    severity: "high",
    pattern: /\bon\w+\s*=\s*["']?[^"'>]*/i,
    description: "Detects inline event handlers like onclick, onload",
  },
  {
    id: "xss-003",
    category: "xss",
    name: "JavaScript Protocol",
    severity: "high",
    pattern: /javascript\s*:/i,
    description: "Detects javascript: protocol in URLs",
  },
  {
    id: "xss-004",
    category: "xss",
    name: "Data URI XSS",
    severity: "medium",
    pattern: /data\s*:\s*text\/html/i,
    description: "Detects data: text/html URIs used for XSS",
  },
  {
    id: "xss-005",
    category: "xss",
    name: "SVG XSS",
    severity: "high",
    pattern: /<svg[\s\S]*?on\w+\s*=/i,
    description: "Detects SVG-based XSS attempts",
  },
];

const PATH_TRAVERSAL_SIGNATURES: readonly AttackSignature[] = [
  {
    id: "pt-001",
    category: "path-traversal",
    name: "Directory Traversal",
    severity: "high",
    pattern: /(\.\.[\/\\]){2,}/,
    description: "Detects directory traversal sequences",
  },
  {
    id: "pt-002",
    category: "path-traversal",
    name: "URL Encoded Traversal",
    severity: "high",
    pattern: /%2e%2e[%2f%5c]/i,
    description: "Detects URL-encoded directory traversal",
  },
];

const COMMAND_INJECTION_SIGNATURES: readonly AttackSignature[] = [
  {
    id: "cmdi-001",
    category: "command-injection",
    name: "Shell Command Injection",
    severity: "critical",
    pattern: /[;&|`$]\s*(ls|cat|pwd|whoami|id|uname|curl|wget|bash|sh|python|perl|ruby)\b/i,
    description: "Detects shell command injection attempts",
  },
  {
    id: "cmdi-002",
    category: "command-injection",
    name: "Command Substitution",
    severity: "critical",
    pattern: /(\$\(|\`)[^)]*(\)|\`)/,
    description: "Detects command substitution syntax",
  },
];

const SSRF_SIGNATURES: readonly AttackSignature[] = [
  {
    id: "ssrf-001",
    category: "ssrf",
    name: "Internal IP SSRF",
    severity: "high",
    pattern: /https?:\/\/(127\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)/,
    description: "Detects requests to internal IP ranges",
  },
  {
    id: "ssrf-002",
    category: "ssrf",
    name: "Localhost SSRF",
    severity: "high",
    pattern: /https?:\/\/localhost/i,
    description: "Detects requests to localhost",
  },
];

export const ALL_SIGNATURES: readonly AttackSignature[] = [
  ...SQLI_SIGNATURES,
  ...XSS_SIGNATURES,
  ...PATH_TRAVERSAL_SIGNATURES,
  ...COMMAND_INJECTION_SIGNATURES,
  ...SSRF_SIGNATURES,
];

export function getSignaturesByCategory(category: SignatureCategory): readonly AttackSignature[] {
  return ALL_SIGNATURES.filter((s) => s.category === category);
}

export function testSignatures(
  input: string,
  categories?: readonly SignatureCategory[],
): AttackSignature | undefined {
  const sigs = categories
    ? ALL_SIGNATURES.filter((s) => categories.includes(s.category))
    : ALL_SIGNATURES;
  return sigs.find((s) => s.pattern.test(input));
}

export function signatureToCondition(sig: AttackSignature, field: RuleCondition["field"]): RuleCondition {
  return {
    field,
    operator: "matches",
    value: sig.pattern.source,
  };
}
