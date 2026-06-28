// Dashboard sharing: generate, validate, and revoke time-limited share tokens.
import { z } from "zod";
import { ok, err, type Result, newId } from "@veritas/core";
import { ShareTokenInvalidError } from "./errors.js";
import { VisibilitySchema } from "./types.js";
import { shareToken, type ShareToken, type DashboardId } from "./types.js";

export const ShareLinkSchema = z.object({
  token: z.string(),
  dashboardId: z.string(),
  visibility: VisibilitySchema,
  expiresAt: z.string().nullable(),
  createdAt: z.string(),
  createdBy: z.string(),
  revoked: z.boolean(),
});
export type ShareLink = z.infer<typeof ShareLinkSchema>;

export interface CreateShareLinkOptions {
  readonly visibility?: "private" | "org" | "public";
  readonly ttlMs?: number;
  readonly createdBy: string;
}

export function createShareLink(
  dashboardId: DashboardId,
  opts: CreateShareLinkOptions,
): ShareLink {
  const now = new Date();
  return {
    token: shareToken(newId("share")) as string,
    dashboardId: dashboardId as string,
    visibility: opts.visibility ?? "org",
    expiresAt: opts.ttlMs != null ? new Date(now.getTime() + opts.ttlMs).toISOString() : null,
    createdAt: now.toISOString(),
    createdBy: opts.createdBy,
    revoked: false,
  };
}

export function isShareLinkValid(link: ShareLink): boolean {
  if (link.revoked) return false;
  if (link.expiresAt !== null && new Date(link.expiresAt).getTime() < Date.now()) return false;
  return true;
}

export function revokeShareLink(link: ShareLink): ShareLink {
  return { ...link, revoked: true };
}

/** In-memory store for share links keyed by token. */
export class InMemoryShareStore {
  readonly #links = new Map<string, ShareLink>();

  save(link: ShareLink): void {
    this.#links.set(link.token, link);
  }

  resolve(token: ShareToken): Result<ShareLink, ShareTokenInvalidError> {
    const link = this.#links.get(token as string);
    if (!link || !isShareLinkValid(link)) {
      return err(new ShareTokenInvalidError(token as string));
    }
    return ok(link);
  }

  revoke(token: ShareToken): Result<ShareLink, ShareTokenInvalidError> {
    const link = this.#links.get(token as string);
    if (!link) return err(new ShareTokenInvalidError(token as string));
    const revoked = revokeShareLink(link);
    this.#links.set(token as string, revoked);
    return ok(revoked);
  }

  listByDashboard(dashboardId: DashboardId): readonly ShareLink[] {
    return Array.from(this.#links.values()).filter(
      (l) => l.dashboardId === (dashboardId as string),
    );
  }

  deleteByDashboard(dashboardId: DashboardId): number {
    let removed = 0;
    for (const [k, v] of this.#links) {
      if (v.dashboardId === (dashboardId as string)) {
        this.#links.delete(k);
        removed++;
      }
    }
    return removed;
  }
}
