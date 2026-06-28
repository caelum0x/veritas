// Shared types for the SSO module (protocols, principals, sessions, configs).

import { z } from "zod";
import type { UserId } from "@veritas/core";

export type SsoProtocol = "saml" | "oidc" | "oauth2";

export const SsoProtocolSchema = z.enum(["saml", "oidc", "oauth2"]);

/** Raw attribute bag returned by an IdP after authentication. */
export type IdpAttributes = Readonly<Record<string, string | string[]>>;

/** Normalised identity resolved from IdP attributes. */
export interface SsoPrincipal {
  readonly externalId: string;
  readonly email: string;
  readonly displayName: string;
  readonly givenName: string | undefined;
  readonly familyName: string | undefined;
  readonly groups: readonly string[];
  readonly rawAttributes: IdpAttributes;
}

/** Represents an active SSO session after successful authentication. */
export interface SsoSession {
  readonly sessionId: string;
  readonly providerId: string;
  readonly userId: UserId;
  readonly principal: SsoPrincipal;
  readonly createdAt: number;
  readonly expiresAt: number;
}

/** Configuration shared across all provider types. */
export interface BaseProviderConfig {
  readonly id: string;
  readonly displayName: string;
  readonly protocol: SsoProtocol;
  readonly orgId: string;
  readonly enabled: boolean;
}

export const BaseProviderConfigSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  protocol: SsoProtocolSchema,
  orgId: z.string().min(1),
  enabled: z.boolean(),
});

/** Result of a completed SSO callback. */
export interface CallbackResult {
  readonly principal: SsoPrincipal;
  readonly providerId: string;
  readonly sessionIndex: string | undefined;
}

/** Options for initiating a JIT provisioning flow for a new user. */
export interface JitProvisioningConfig {
  readonly enabled: boolean;
  readonly defaultOrgId: string;
  readonly allowedEmailDomains: readonly string[];
  readonly defaultScopes: readonly string[];
}

export const JitProvisioningConfigSchema = z.object({
  enabled: z.boolean(),
  defaultOrgId: z.string().min(1),
  allowedEmailDomains: z.array(z.string().min(1)),
  defaultScopes: z.array(z.string().min(1)),
});
