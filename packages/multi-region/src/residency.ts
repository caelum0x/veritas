// Data residency enforcement — validates that data operations respect zone-level storage rules.

import { type Result, ok, err } from "@veritas/core";
import { type RegionId, type Region } from "./region.js";
import { type DataResidencyZone } from "./types.js";
import { ResidencyViolationError } from "./errors.js";

/** Maps a residency zone to the set of region-id prefixes that satisfy it. */
const ZONE_REGION_PREFIXES: Readonly<Record<DataResidencyZone, readonly string[]>> = {
  us: ["us-", "use-", "usw-"],
  eu: ["eu-", "euw-", "euc-", "eun-"],
  ap: ["ap-", "apn-", "aps-", "ape-"],
  global: [],
};

/** Checks whether a region satisfies a given data residency zone. */
export function regionSatisfiesZone(region: Region, zone: DataResidencyZone): boolean {
  if (zone === "global") return true;
  const prefixes = ZONE_REGION_PREFIXES[zone];
  return prefixes.some((p) => region.id.startsWith(p));
}

/** Residency rule: a data type must stay within certain zones. */
export interface ResidencyRule {
  readonly dataType: string;
  readonly allowedZones: readonly DataResidencyZone[];
}

/** Port interface for a residency policy store (testable via in-memory impl). */
export interface ResidencyPolicyPort {
  getRulesForDataType(dataType: string): Promise<readonly ResidencyRule[]>;
  addRule(rule: ResidencyRule): Promise<void>;
  removeRule(dataType: string): Promise<void>;
}

/** Validates that a target region satisfies residency rules for a given data type. */
export async function checkResidency(
  policy: ResidencyPolicyPort,
  dataType: string,
  targetRegion: Region
): Promise<Result<void, ResidencyViolationError>> {
  const rules = await policy.getRulesForDataType(dataType);
  if (rules.length === 0) return ok(undefined);

  const allowed = rules.every((rule) =>
    rule.allowedZones.some((zone) => regionSatisfiesZone(targetRegion, zone))
  );

  if (!allowed) {
    return err(
      new ResidencyViolationError(dataType, targetRegion.id as RegionId)
    );
  }

  return ok(undefined);
}

/** In-memory implementation of ResidencyPolicyPort for development and testing. */
export class InMemoryResidencyPolicy implements ResidencyPolicyPort {
  private readonly rules = new Map<string, ResidencyRule>();

  async getRulesForDataType(dataType: string): Promise<readonly ResidencyRule[]> {
    const rule = this.rules.get(dataType);
    return rule ? [rule] : [];
  }

  async addRule(rule: ResidencyRule): Promise<void> {
    this.rules.set(rule.dataType, rule);
  }

  async removeRule(dataType: string): Promise<void> {
    this.rules.delete(dataType);
  }
}
