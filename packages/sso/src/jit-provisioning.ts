// Just-in-time user provisioning: creates or updates a user account on first SSO login.

import { z } from "zod";
import { ok, err, type Result, newUserId } from "@veritas/core";
import { JitProvisioningError } from "./errors.js";
import type { SsoPrincipal, JitProvisioningConfig } from "./types.js";
import type { UserId } from "@veritas/core";

/** Minimal user record created or resolved during JIT provisioning. */
export interface ProvisionedUser {
  readonly userId: UserId;
  readonly email: string;
  readonly displayName: string;
  readonly orgId: string;
  readonly createdNow: boolean;
}

/** Port interface for user lookup and creation during JIT provisioning. */
export interface UserProvisioningPort {
  findByEmail(email: string): Promise<ProvisionedUser | undefined>;
  create(params: {
    readonly userId: UserId;
    readonly email: string;
    readonly displayName: string;
    readonly orgId: string;
    readonly externalId: string;
    readonly providerId: string;
  }): Promise<ProvisionedUser>;
  update(userId: UserId, params: {
    readonly displayName?: string;
    readonly externalId?: string;
  }): Promise<ProvisionedUser>;
}

export const JitProvisioningConfigSchema = z.object({
  enabled: z.boolean(),
  defaultOrgId: z.string().min(1),
  allowedEmailDomains: z.array(z.string().min(1)),
  defaultScopes: z.array(z.string().min(1)),
});

/** Returns true if the email domain is permitted by the JIT config. */
function isEmailDomainAllowed(
  email: string,
  allowedDomains: readonly string[]
): boolean {
  if (allowedDomains.length === 0) return true;
  const atIdx = email.lastIndexOf("@");
  if (atIdx === -1) return false;
  const domain = email.slice(atIdx + 1).toLowerCase();
  return allowedDomains.some((d) => d.toLowerCase() === domain);
}

/**
 * Provisions or looks up a user account based on the SSO principal.
 * Creates the user if they do not exist; updates display name if they do.
 */
export async function provisionUser(
  principal: SsoPrincipal,
  providerId: string,
  config: JitProvisioningConfig,
  port: UserProvisioningPort
): Promise<Result<ProvisionedUser, JitProvisioningError>> {
  if (!config.enabled) {
    return err(new JitProvisioningError("JIT provisioning is disabled for this provider"));
  }

  if (!isEmailDomainAllowed(principal.email, config.allowedEmailDomains)) {
    return err(
      new JitProvisioningError(
        `Email domain not allowed for JIT provisioning: ${principal.email}`
      )
    );
  }

  try {
    const existing = await port.findByEmail(principal.email);

    if (existing !== undefined) {
      const updated = await port.update(existing.userId, {
        displayName: principal.displayName,
        externalId: principal.externalId,
      });
      return ok({ ...updated, createdNow: false });
    }

    const userId = newUserId();
    const created = await port.create({
      userId,
      email: principal.email,
      displayName: principal.displayName,
      orgId: config.defaultOrgId,
      externalId: principal.externalId,
      providerId,
    });

    return ok({ ...created, createdNow: true });
  } catch (cause) {
    return err(new JitProvisioningError("Unexpected error during user provisioning", cause));
  }
}

/** In-memory UserProvisioningPort for development and tests. */
export function createInMemoryUserProvisioningPort(): UserProvisioningPort {
  const byEmail = new Map<string, ProvisionedUser>();
  const byId = new Map<UserId, ProvisionedUser>();

  return {
    async findByEmail(email: string): Promise<ProvisionedUser | undefined> {
      return byEmail.get(email.toLowerCase());
    },

    async create(params): Promise<ProvisionedUser> {
      const user: ProvisionedUser = {
        userId: params.userId,
        email: params.email,
        displayName: params.displayName,
        orgId: params.orgId,
        createdNow: true,
      };
      byEmail.set(params.email.toLowerCase(), user);
      byId.set(params.userId, user);
      return user;
    },

    async update(userId: UserId, params): Promise<ProvisionedUser> {
      const existing = byId.get(userId);
      if (existing === undefined) {
        throw new JitProvisioningError(`User not found for update: ${userId}`);
      }
      const updated: ProvisionedUser = {
        ...existing,
        ...(params.displayName !== undefined ? { displayName: params.displayName } : {}),
      };
      byEmail.set(existing.email.toLowerCase(), updated);
      byId.set(userId, updated);
      return updated;
    },
  };
}
