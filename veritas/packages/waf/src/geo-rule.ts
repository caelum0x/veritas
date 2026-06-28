// Geo-based access rules: allow/block by country code with configurable lists
import { z } from "zod";

export const GeoRuleModeSchema = z.enum(["allowlist", "blocklist"]);
export type GeoRuleMode = z.infer<typeof GeoRuleModeSchema>;

export const GeoRuleSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  enabled: z.boolean().default(true),
  mode: GeoRuleModeSchema,
  countryCodes: z.array(z.string().length(2).toUpperCase()).min(1),
  action: z.enum(["block", "challenge", "log"]).default("block"),
});
export type GeoRule = z.infer<typeof GeoRuleSchema>;

export function makeGeoRule(input: z.input<typeof GeoRuleSchema>): GeoRule {
  return GeoRuleSchema.parse(input);
}

export function evaluateGeoRule(rule: GeoRule, countryCode: string): boolean {
  if (!rule.enabled) return true;

  const normalizedCode = countryCode.toUpperCase();
  const inList = rule.countryCodes.includes(normalizedCode);

  if (rule.mode === "allowlist") {
    return inList;
  }
  // blocklist mode: block if in list
  return !inList;
}

export function isGeoAllowed(
  rules: readonly GeoRule[],
  countryCode: string,
): { allowed: boolean; matchedRule: GeoRule | undefined } {
  const enabledRules = rules.filter((r) => r.enabled);

  for (const rule of enabledRules) {
    const allowed = evaluateGeoRule(rule, countryCode);
    if (!allowed) {
      return { allowed: false, matchedRule: rule };
    }
  }

  return { allowed: true, matchedRule: undefined };
}

export const SANCTIONED_COUNTRY_CODES: readonly string[] = [
  "CU", "IR", "KP", "RU", "SY",
];

export function makeDefaultSanctionedGeoRule(): GeoRule {
  return makeGeoRule({
    id: "default-sanctions",
    name: "Sanctioned Countries Block",
    enabled: true,
    mode: "blocklist",
    countryCodes: SANCTIONED_COUNTRY_CODES as string[],
    action: "block",
  });
}
