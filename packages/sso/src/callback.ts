// SSO callback handler: orchestrates state verification, assertion handling, and session creation.

import { err, isErr, type Result } from "@veritas/core";
import type { ProviderRegistry } from "./registry.js";
import type { StateStore } from "./state.js";
import { consumeState } from "./state.js";
import type { CallbackParams, IdentityAssertion } from "./provider.js";
import type { ProviderError } from "./errors.js";
import { CallbackError, InvalidStateError } from "./errors.js";

export interface CallbackRequest {
  /** The provider id derived from the callback URL path or query param. */
  readonly providerId: string;
  /** All query/body parameters delivered to the callback endpoint. */
  readonly params: CallbackParams;
}

export interface CallbackOutcome {
  readonly assertion: IdentityAssertion;
  readonly providerId: string;
  /** Relay state returned by IdP (SAML) or redirect URI (OIDC/OAuth2). */
  readonly relayState: string | undefined;
}

/**
 * Processes an IdP callback end-to-end:
 *  1. Resolves the provider from the registry.
 *  2. For OIDC/OAuth2 flows: consumes and validates the OAuth state.
 *  3. Delegates assertion validation to the provider.
 *  4. Returns the normalised CallbackOutcome.
 */
export async function handleSsoCallback(
  request: CallbackRequest,
  registry: ProviderRegistry,
  stateStore: StateStore,
  nowMs: number = Date.now()
): Promise<Result<CallbackOutcome, ProviderError>> {
  const resolveResult = registry.resolve(request.providerId);
  if (isErr(resolveResult)) return resolveResult;
  const provider = resolveResult.value;

  let storedState = "";

  if (provider.config.protocol !== "saml") {
    const stateParam = request.params["state"];
    if (!stateParam) {
      return err(new InvalidStateError("missing state parameter in callback"));
    }
    const stateResult = await consumeState(stateStore, stateParam, nowMs);
    if (isErr(stateResult)) return stateResult;
    storedState = stateResult.value.state;
  } else {
    storedState = request.params["RelayState"] ?? "";
  }

  const assertionResult = await provider.handleCallback(
    request.params,
    storedState
  );
  if (isErr(assertionResult)) return assertionResult;

  return {
    ok: true,
    value: {
      assertion: assertionResult.value,
      providerId: request.providerId,
      relayState: request.params["RelayState"] ?? request.params["state"],
    },
  } as Result<CallbackOutcome, ProviderError>;
}

/**
 * Extracts a user-facing error message from any ProviderError
 * suitable for returning in an HTTP 400/401 response body.
 */
export function formatCallbackError(error: ProviderError): string {
  if (error instanceof CallbackError) return error.message;
  if (error instanceof InvalidStateError) return error.message;
  return "Authentication failed. Please try again.";
}
