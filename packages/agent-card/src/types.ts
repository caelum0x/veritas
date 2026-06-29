// Shared type aliases and constants used across the agent-card package.

import { z } from "zod";

/** Semantic version string, e.g. "1.2.3". */
export const SemVerSchema = z.string().regex(/^\d+\.\d+\.\d+$/, "Must be semver x.y.z");
export type SemVer = z.infer<typeof SemVerSchema>;

/** A2A / CROO agent protocol version supported by this card. */
export const AgentProtocolVersionSchema = z.enum(["0.1", "0.2", "1.0"]);
export type AgentProtocolVersion = z.infer<typeof AgentProtocolVersionSchema>;

/** Supported runtime categories for an agent. */
export const AgentRuntimeSchema = z.enum(["cloud", "edge", "local", "hybrid"]);
export type AgentRuntime = z.infer<typeof AgentRuntimeSchema>;

/** Lifecycle stage of the agent. */
export const AgentMaturitySchema = z.enum(["alpha", "beta", "stable", "deprecated"]);
export type AgentMaturity = z.infer<typeof AgentMaturitySchema>;

/** SPDX license expression or "proprietary". */
export const LicenseSchema = z.string().min(1);
export type License = z.infer<typeof LicenseSchema>;

/** Contact info for the card owner. */
export const ContactSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  url: z.string().url().optional(),
});
export type Contact = z.infer<typeof ContactSchema>;

/** Arbitrary key-value extension bag for forward-compatibility. */
export const ExtensionsSchema = z.record(z.unknown());
export type Extensions = z.infer<typeof ExtensionsSchema>;

/** Registry where a card is published. */
export const RegistryKindSchema = z.enum(["croo", "custom", "dns-txt"]);
export type RegistryKind = z.infer<typeof RegistryKindSchema>;

export interface PublishTarget {
  readonly kind: RegistryKind;
  /** Base URL of the registry API. */
  readonly registryUrl: string;
  /** Auth token used to write to the registry. */
  readonly authToken?: string;
}
