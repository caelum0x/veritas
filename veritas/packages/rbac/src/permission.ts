// Permission string definitions, parsing, and type utilities for Veritas RBAC.
import { Brand, brand, unbrand } from "@veritas/core";

/** Permission string branded type: "<resource>:<action>" */
export type Permission = Brand<string, "Permission">;

export const permission = (resource: string, action: string): Permission =>
  brand<string, "Permission">(`${resource}:${action}`);

export const rawPermission = (value: string): Permission =>
  brand<string, "Permission">(value);

export const unPermission = (p: Permission): string => unbrand(p);

export interface ParsedPermission {
  readonly resource: string;
  readonly action: string;
}

export function parsePermission(p: Permission): ParsedPermission {
  const raw = unbrand(p);
  const idx = raw.indexOf(":");
  if (idx === -1) return { resource: raw, action: "*" };
  return { resource: raw.slice(0, idx), action: raw.slice(idx + 1) };
}

export function permissionMatches(
  required: Permission,
  granted: Permission
): boolean {
  if (granted === required) return true;
  const req = parsePermission(required);
  const gr = parsePermission(granted);
  if (gr.resource !== req.resource && gr.resource !== "*") return false;
  return gr.action === "*" || gr.action === req.action;
}

/** Well-known action tokens. */
export const ACTION_READ = "read";
export const ACTION_WRITE = "write";
export const ACTION_CREATE = "create";
export const ACTION_UPDATE = "update";
export const ACTION_DELETE = "delete";
export const ACTION_MANAGE = "manage";
export const ACTION_EXECUTE = "execute";
export const ACTION_EXPORT = "export";
export const ACTION_APPROVE = "approve";
export const ACTION_WILDCARD = "*";

/** Well-known resource tokens. */
export const RESOURCE_CLAIM = "claim";
export const RESOURCE_ORDER = "order";
export const RESOURCE_REPORT = "report";
export const RESOURCE_SOURCE = "source";
export const RESOURCE_AGENT = "agent";
export const RESOURCE_BILLING = "billing";
export const RESOURCE_ADMIN = "admin";
export const RESOURCE_MEMBER = "member";
export const RESOURCE_WEBHOOK = "webhook";
export const RESOURCE_API_KEY = "api_key";
export const RESOURCE_AUDIT = "audit";
export const RESOURCE_WILDCARD = "*";
