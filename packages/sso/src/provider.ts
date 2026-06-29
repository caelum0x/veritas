// IdP provider port: abstract interface for SAML, OIDC, and OAuth2 identity providers

import type { Result } from "@veritas/core";
import type { SsoPrincipal, SsoProtocol, BaseProviderConfig, CallbackResult } from "./types.js";
import type { SsoError } from "./errors.js";

/** Protocol discriminant re-exported for external consumers. */
export type ProviderProtocol = SsoProtocol;

/** Identity assertion returned after a successful IdP callback — alias for CallbackResult. */
export type IdentityAssertion = CallbackResult;

/** Full provider configuration (union of all protocol-specific configs). */
export type ProviderConfig = BaseProviderConfig;

/** Options for initiating an SSO login flow. */
export interface LoginOptions {
  readonly relayState?: string;
  readonly loginHint?: string;
  readonly forceReauth?: boolean;
}

/** Redirect URL and opaque state to send to the browser. */
export interface LoginRedirect {
  readonly redirectUrl: string;
  readonly state: string;
}

/** Raw callback parameters from the IdP (query string or POST body). */
export type CallbackParams = Readonly<Record<string, string>>;

/** Port interface every IdP adapter must implement. */
export interface IdpProvider {
  readonly config: BaseProviderConfig;

  /** Build the login redirect URL and opaque state blob. */
  initiateLogin(options: LoginOptions): Promise<Result<LoginRedirect, SsoError>>;

  /** Validate the callback from the IdP and return normalised identity + session index. */
  handleCallback(
    params: CallbackParams,
    storedState: string,
  ): Promise<Result<CallbackResult, SsoError>>;

  /** Resolve the full SsoPrincipal from a callback result (may do JIT provisioning). */
  resolvePrincipal(
    result: CallbackResult,
  ): Promise<Result<SsoPrincipal, SsoError>>;

  /** Health probe — confirm the IdP metadata/config is reachable. */
  healthCheck(): Promise<Result<void, SsoError>>;
}
