// Shared types for the agent store package.
import { Id } from "@veritas/core";

export type AgentStoreId = Id<"agent-store">;
export type ServiceId = Id<"service">;
export type ListingId = Id<"listing">;
export type ManifestId = Id<"manifest">;

export interface Timestamps {
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface SlaSpec {
  readonly uptimePercent: number;
  readonly p95LatencyMs: number;
  readonly maxRetries: number;
  readonly timeoutMs: number;
}

export const DEFAULT_SLA: SlaSpec = {
  uptimePercent: 99.0,
  p95LatencyMs: 2000,
  maxRetries: 3,
  timeoutMs: 30_000,
};

export interface InputOutputSchema {
  readonly inputSchema: Record<string, unknown>;
  readonly outputSchema: Record<string, unknown>;
}

export type StoreCategory =
  | "fact_verification"
  | "source_analysis"
  | "provenance"
  | "summarization"
  | "translation"
  | "other";

export type StoreStatus = "active" | "inactive" | "deprecated" | "pending";

export interface ContactInfo {
  readonly email: string;
  readonly website?: string;
  readonly supportUrl?: string;
}
