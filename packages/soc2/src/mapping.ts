// Framework mapping: relates SOC2 controls to external compliance frameworks (ISO 27001, NIST, etc.).

import { z } from "zod";
import { isoTimestampSchema } from "@veritas/core";
import { type TrustServiceCategory } from "./control.js";

export const ExternalFrameworkSchema = z.enum([
  "iso_27001",
  "nist_csf",
  "nist_800_53",
  "pci_dss",
  "hipaa",
  "gdpr",
  "ccpa",
  "cis_controls",
  "cobit",
  "fedramp",
]);
export type ExternalFramework = z.infer<typeof ExternalFrameworkSchema>;

export const MappingStrengthSchema = z.enum([
  "full",
  "partial",
  "informational",
]);
export type MappingStrength = z.infer<typeof MappingStrengthSchema>;

export const FrameworkControlRefSchema = z.object({
  framework: ExternalFrameworkSchema,
  controlId: z.string().min(1),
  controlName: z.string().min(1),
  section: z.string().optional(),
});
export type FrameworkControlRef = z.infer<typeof FrameworkControlRefSchema>;

export const ControlMappingSchema = z.object({
  id: z.string().min(1),
  soc2ControlId: z.string().min(1),
  soc2ControlCode: z.string().min(1),
  externalRef: FrameworkControlRefSchema,
  strength: MappingStrengthSchema,
  rationale: z.string().min(1),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
});
export type ControlMapping = z.infer<typeof ControlMappingSchema>;

export const CreateControlMappingSchema = ControlMappingSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type CreateControlMapping = z.infer<typeof CreateControlMappingSchema>;

export const FrameworkCoverageSchema = z.object({
  framework: ExternalFrameworkSchema,
  totalControls: z.number().int().nonnegative(),
  mappedControls: z.number().int().nonnegative(),
  fullMappings: z.number().int().nonnegative(),
  partialMappings: z.number().int().nonnegative(),
  coveragePercent: z.number().min(0).max(100),
});
export type FrameworkCoverage = z.infer<typeof FrameworkCoverageSchema>;

/** Group mappings by the external framework they target. */
export function groupMappingsByFramework(
  mappings: readonly ControlMapping[],
): Readonly<Record<string, ControlMapping[]>> {
  const groups: Record<string, ControlMapping[]> = {};
  for (const mapping of mappings) {
    const key = mapping.externalRef.framework;
    if (!groups[key]) groups[key] = [];
    groups[key].push(mapping);
  }
  return groups;
}

/** Compute coverage statistics for one framework given all mappings. */
export function computeFrameworkCoverage(
  framework: ExternalFramework,
  mappings: readonly ControlMapping[],
  totalFrameworkControls: number,
): FrameworkCoverage {
  const relevant = mappings.filter(
    (m) => m.externalRef.framework === framework,
  );
  const uniqueExternalIds = new Set(
    relevant.map((m) => m.externalRef.controlId),
  );
  const mappedControls = uniqueExternalIds.size;
  const fullMappings = relevant.filter((m) => m.strength === "full").length;
  const partialMappings = relevant.filter(
    (m) => m.strength === "partial",
  ).length;
  const coveragePercent =
    totalFrameworkControls > 0
      ? Math.round((mappedControls / totalFrameworkControls) * 10000) / 100
      : 0;

  return {
    framework,
    totalControls: totalFrameworkControls,
    mappedControls,
    fullMappings,
    partialMappings,
    coveragePercent,
  };
}

/** Find all SOC2 control IDs that cover a specific external framework control. */
export function findSoc2ControlsForExternal(
  framework: ExternalFramework,
  externalControlId: string,
  mappings: readonly ControlMapping[],
): string[] {
  return mappings
    .filter(
      (m) =>
        m.externalRef.framework === framework &&
        m.externalRef.controlId === externalControlId,
    )
    .map((m) => m.soc2ControlId);
}

/** Static lookup: canonical trust-service categories typically mapped to each framework. */
export const FRAMEWORK_CATEGORY_AFFINITIES: Readonly<
  Record<ExternalFramework, readonly TrustServiceCategory[]>
> = {
  iso_27001: ["security", "confidentiality", "availability"],
  nist_csf: ["security", "availability", "processing_integrity"],
  nist_800_53: [
    "security",
    "availability",
    "processing_integrity",
    "confidentiality",
    "privacy",
  ],
  pci_dss: ["security", "confidentiality", "processing_integrity"],
  hipaa: ["security", "confidentiality", "privacy"],
  gdpr: ["privacy", "confidentiality", "security"],
  ccpa: ["privacy", "confidentiality"],
  cis_controls: ["security", "availability"],
  cobit: [
    "security",
    "availability",
    "processing_integrity",
    "confidentiality",
  ],
  fedramp: [
    "security",
    "availability",
    "processing_integrity",
    "confidentiality",
    "privacy",
  ],
};
