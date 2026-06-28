// Authenticator interface: contract for request authentication strategies.

import type { Result } from "@veritas/core";
import type { Principal } from "./principal.js";
import type { AuthError } from "./errors.js";

/** Context supplied to an authenticator for each incoming request. */
export interface AuthContext {
  /** Raw authorization header value, e.g. "Bearer sk_..." or "ApiKey veritas_sk_..." */
  readonly authorizationHeader: string | undefined;
  /** HMAC signature header (X-Veritas-Signature), if present. */
  readonly signatureHeader: string | undefined;
  /** Request timestamp header (X-Veritas-Timestamp), if present. */
  readonly timestampHeader: string | undefined;
  /** The HTTP method of the incoming request. */
  readonly method: string;
  /** The full request URL (including path and query). */
  readonly url: string;
  /** The raw request body as a string (empty string if none). */
  readonly body: string;
  /** Remote IP address of the caller. */
  readonly remoteIp: string | undefined;
}

/**
 * Authenticator: accepts a raw request context and returns the authenticated
 * principal, or an AuthError if the request cannot be authenticated.
 */
export interface Authenticator {
  authenticate(ctx: AuthContext): Promise<Result<Principal, AuthError>>;
}
