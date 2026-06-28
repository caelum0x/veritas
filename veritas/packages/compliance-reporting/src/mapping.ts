// Control-to-requirement mapping: associates SOC2 controls with compliance framework requirements.

import { z } from "zod";
import { type IsoTimestamp, isoTimestampSchema } from "@veritas/core";
import { FrameworkIdSchema, type FrameworkId, type Requirement, getFramework } from "./framework.js";

export const MappingStrengthSchema = z.enum(["full", "partial", "informational"]);
export type MappingStrength = z.infer<typeof MappingStrengthSchema>;

export const ControlRequirementMappingSchema = z.object({
  id: z.string().min(1),
  controlId: z.string().min(1),
  controlCode: z.string().min(1),
  frameworkId: FrameworkIdSchema,
  requirementId: z.string().min(1),
  requirementCode: z.string().min(1),
  strength: MappingStrengthSchema,
  rationale: z.string().min(1),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
});
export type ControlRequirementMapping = z.infer<typeof ControlRequirementMappingSchema>;

export const CreateControlRequirementMappingSchema = ControlRequirementMappingSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type CreateControlRequirementMapping = z.infer<typeof CreateControlRequirementMappingSchema>;

export const MappingCoverageSchema = z.object({
  frameworkId: FrameworkIdSchema,
  totalRequirements: z.number().int().nonnegative(),
  mappedRequirements: z.number().int().nonnegative(),
  fullyMappedRequirements: z.number().int().nonnegative(),
  partiallyMappedRequirements: z.number().int().nonnegative(),
  unmappedRequirements: z.number().int().nonnegative(),
  coveragePercent: z.number().min(0).max(100),
});
export type MappingCoverage = z.infer<typeof MappingCoverageSchema>;

/** Return all mappings for a specific framework. */
export function getMappingsForFramework(
  mappings: readonly ControlRequirementMapping[],
  frameworkId: FrameworkId,
): ControlRequirementMapping[] {
  return mappings.filter((m) => m.frameworkId === frameworkId);
}

/** Return all mappings for a specific control. */
export function getMappingsForControl(
  mappings: readonly ControlRequirementMapping[],
  controlId: string,
): ControlRequirementMapping[] {
  return mappings.filter((m) => m.controlId === controlId);
}

/** Return all mappings for a specific requirement. */
export function getMappingsForRequirement(
  mappings: readonly ControlRequirementMapping[],
  requirementId: string,
): ControlRequirementMapping[] {
  return mappings.filter((m) => m.requirementId === requirementId);
}

/** Find control IDs that satisfy a given requirement. */
export function getControlsForRequirement(
  mappings: readonly ControlRequirementMapping[],
  requirementId: string,
  strengthFilter?: MappingStrength,
): string[] {
  return mappings
    .filter(
      (m) =>
        m.requirementId === requirementId &&
        (strengthFilter == null || m.strength === strengthFilter),
    )
    .map((m) => m.controlId);
}

/** Find requirement IDs covered by a given control. */
export function getRequirementsForControl(
  mappings: readonly ControlRequirementMapping[],
  controlId: string,
  frameworkId?: FrameworkId,
): string[] {
  return mappings
    .filter(
      (m) =>
        m.controlId === controlId &&
        (frameworkId == null || m.frameworkId === frameworkId),
    )
    .map((m) => m.requirementId);
}

/** Compute mapping coverage statistics for one framework. */
export function computeMappingCoverage(
  mappings: readonly ControlRequirementMapping[],
  frameworkId: FrameworkId,
): MappingCoverage {
  const framework = getFramework(frameworkId);
  const totalRequirements = framework.requirements.length;
  const frameworkMappings = getMappingsForFramework(mappings, frameworkId);

  const mappedReqIds = new Set(frameworkMappings.map((m) => m.requirementId));
  const fullyMappedReqIds = new Set(
    frameworkMappings
      .filter((m) => m.strength === "full")
      .map((m) => m.requirementId),
  );
  const partiallyMappedReqIds = new Set(
    frameworkMappings
      .filter((m) => m.strength === "partial" && !fullyMappedReqIds.has(m.requirementId))
      .map((m) => m.requirementId),
  );

  const mappedRequirements = mappedReqIds.size;
  const fullyMappedRequirements = fullyMappedReqIds.size;
  const partiallyMappedRequirements = partiallyMappedReqIds.size;
  const unmappedRequirements = totalRequirements - mappedRequirements;
  const coveragePercent =
    totalRequirements > 0
      ? Math.round((mappedRequirements / totalRequirements) * 10000) / 100
      : 0;

  return {
    frameworkId,
    totalRequirements,
    mappedRequirements,
    fullyMappedRequirements,
    partiallyMappedRequirements,
    unmappedRequirements,
    coveragePercent,
  };
}

/** Group mappings by requirement, returning a map of requirementId -> mappings. */
export function groupMappingsByRequirement(
  mappings: readonly ControlRequirementMapping[],
): Map<string, ControlRequirementMapping[]> {
  const result = new Map<string, ControlRequirementMapping[]>();
  for (const mapping of mappings) {
    const existing = result.get(mapping.requirementId) ?? [];
    result.set(mapping.requirementId, [...existing, mapping]);
  }
  return result;
}

/** Group mappings by control ID. */
export function groupMappingsByControl(
  mappings: readonly ControlRequirementMapping[],
): Map<string, ControlRequirementMapping[]> {
  const result = new Map<string, ControlRequirementMapping[]>();
  for (const mapping of mappings) {
    const existing = result.get(mapping.controlId) ?? [];
    result.set(mapping.controlId, [...existing, mapping]);
  }
  return result;
}

/** Return requirements that have no control mapping for a given framework. */
export function getUnmappedRequirements(
  mappings: readonly ControlRequirementMapping[],
  frameworkId: FrameworkId,
): Requirement[] {
  const framework = getFramework(frameworkId);
  const mappedIds = new Set(
    getMappingsForFramework(mappings, frameworkId).map((m) => m.requirementId),
  );
  return framework.requirements.filter((r) => !mappedIds.has(r.id));
}
