// Message role helpers re-exported from types; provides utility guards and constants
import type { MessageRole } from "./types.js";

export { MessageRoleSchema } from "./types.js";
export type { MessageRole } from "./types.js";

export const ROLES = {
  USER: "user" as const,
  ASSISTANT: "assistant" as const,
  SYSTEM: "system" as const,
} satisfies Record<string, MessageRole>;

export function isUserRole(role: MessageRole): boolean {
  return role === ROLES.USER;
}

export function isAssistantRole(role: MessageRole): boolean {
  return role === ROLES.ASSISTANT;
}

export function isSystemRole(role: MessageRole): boolean {
  return role === ROLES.SYSTEM;
}
