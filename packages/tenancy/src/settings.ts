// Tenant-scoped settings: storage, validation, and typed accessors
import { z } from "zod";

export const TenantSettingsSchema = z.object({
  /** Display name override for the tenant portal */
  displayName: z.string().min(1).max(120).optional(),
  /** Allowed email domains for SSO auto-provisioning */
  allowedEmailDomains: z.array(z.string().min(1)).default([]),
  /** Enforce MFA for all members */
  requireMfa: z.boolean().default(false),
  /** Default locale for outbound notifications */
  defaultLocale: z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/).default("en"),
  /** Webhook signing secret (stored hashed at rest) */
  webhookSigningSecret: z.string().optional(),
  /** Custom branding logo URL */
  logoUrl: z.string().url().optional(),
  /** Maximum idle session duration in seconds */
  sessionTimeoutSeconds: z.number().int().positive().default(3_600),
  /** Whether the tenant is in read-only maintenance mode */
  maintenanceMode: z.boolean().default(false),
  /** Arbitrary key-value metadata for integrations */
  customMetadata: z.record(z.string(), z.string()).default({}),
});

export type TenantSettings = z.infer<typeof TenantSettingsSchema>;

export const DEFAULT_TENANT_SETTINGS: Readonly<TenantSettings> = Object.freeze(
  TenantSettingsSchema.parse({})
);

/** Merge partial overrides onto a base settings object (immutable) */
export function mergeSettings(
  base: TenantSettings,
  overrides: Partial<TenantSettings>
): TenantSettings {
  return TenantSettingsSchema.parse({ ...base, ...overrides });
}

/** Return true when the tenant is currently in maintenance mode */
export function isMaintenanceMode(settings: TenantSettings): boolean {
  return settings.maintenanceMode;
}
