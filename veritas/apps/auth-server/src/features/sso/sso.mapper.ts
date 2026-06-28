// Maps SSO domain objects to HTTP response shapes.

import type { SsoAuthResponse, SsoProviderListItem } from "./sso.schema.js";
import type { IdpProvider } from "@veritas/sso";

/** Build an auth response from a token + resolved principal identifiers. */
export function toSsoAuthResponse(
  token: string,
  userId: string,
  organizationId: string,
  sessionId: string,
): SsoAuthResponse {
  return { token, userId, organizationId, sessionId };
}

/** Map an IdpProvider to the public list representation. */
export function toProviderListItem(provider: IdpProvider): SsoProviderListItem {
  return {
    id: provider.config.id,
    displayName: provider.config.displayName,
    protocol: provider.config.protocol,
  };
}
