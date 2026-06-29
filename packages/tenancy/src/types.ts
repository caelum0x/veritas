// Shared type definitions for the tenancy package
import type { Request } from "express";
import type { Tenant } from "./tenant.js";

/** Strategy used to resolve the active tenant from an incoming request */
export type TenantResolutionStrategy = "host" | "header" | "principal" | "path";

/** Options controlling how tenant resolution behaves */
export interface TenantResolutionOptions {
  /** Which strategy to apply; defaults to "header" */
  strategy: TenantResolutionStrategy;
  /** Header name when strategy is "header"; defaults to "x-tenant-id" */
  headerName?: string;
  /** Whether a missing tenant is fatal (401) or silently skipped */
  required?: boolean;
}

/** Represents an authenticated principal attached to a request */
export interface Principal {
  userId: string;
  organizationId?: string;
  tenantId?: string;
  roles: readonly string[];
}

/** Express Request augmented with resolved tenant and principal */
export type TenantRequest = Request & {
  tenant?: Tenant;
  principal?: Principal;
};

/** Lifecycle hooks fired during tenant provisioning */
export interface TenantProvisioningHooks {
  onBeforeProvision?: (slug: string) => Promise<void>;
  onAfterProvision?: (tenant: Readonly<Tenant>) => Promise<void>;
  onBeforeDeprovision?: (tenant: Readonly<Tenant>) => Promise<void>;
  onAfterDeprovision?: (tenantId: string) => Promise<void>;
}

/** Status of a tenant */
export type TenantStatus = "active" | "suspended" | "deprovisioned";

/** Feature flags that may be enabled per tenant */
export interface TenantFeatureFlags {
  webhooksEnabled: boolean;
  apiV2Enabled: boolean;
  advancedReportingEnabled: boolean;
  customModelsEnabled: boolean;
}
