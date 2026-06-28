// Maps internal login domain types to HTTP response shapes.

import type { LoginResponse } from "./login.schema.js";

export interface LoginPrincipal {
  readonly userId: string;
  readonly organizationId: string;
  readonly sessionId: string;
}

/** Build a LoginResponse envelope from a token + principal. */
export function toLoginResponse(token: string, principal: LoginPrincipal): LoginResponse {
  return {
    token,
    userId: principal.userId,
    organizationId: principal.organizationId,
    sessionId: principal.sessionId,
  };
}
