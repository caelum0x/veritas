// Public re-exports for @veritas/auth package

export type { ApiKey } from "./api-key.js";
export {
  parseApiKey,
  generateApiKeyString,
  isValidApiKeyFormat,
  maskApiKey,
} from "./api-key.js";

export type { ApiKeyHasher } from "./api-key-hasher.js";
export { createApiKeyHasher } from "./api-key-hasher.js";

export type { Scope } from "./scopes.js";
export { ALL_SCOPES, isScope } from "./scopes.js";

export {
  hasScope,
  hasAllScopes,
  hasAnyScope,
} from "./permission.js";

export type { Principal, ApiKeyPrincipal, SessionPrincipal, AgentPrincipal } from "./principal.js";
export { isApiKeyPrincipal, isSessionPrincipal, isAgentPrincipal } from "./principal.js";

export type { Authenticator, AuthContext } from "./authenticator.js";

export type { ApiKeyStore } from "./api-key-authenticator.js";
export { ApiKeyAuthenticator } from "./api-key-authenticator.js";

export type { VerifySignatureOptions } from "./signature.js";
export { signRequest, verifyRequestSignature } from "./signature.js";

export type { SessionTokenPayload, VerifyTokenOptions } from "./token.js";
export { generateToken, verifyToken } from "./token.js";

export { deriveRateLimitKey } from "./rate-limit-key.js";

export type { IpAllowlist } from "./ip-allowlist.js";
export {
  isIpAllowed,
  createAllowlist,
  openAllowlist,
} from "./ip-allowlist.js";

export type { AuthError } from "./errors.js";
export {
  InvalidApiKeyError,
  ExpiredApiKeyError,
  RevokedApiKeyError,
  MissingCredentialsError,
  InvalidSignatureError,
  SignatureExpiredError,
  InvalidTokenError,
  ExpiredTokenError,
  InsufficientScopeError,
  IpDeniedError,
  AuthRateLimitedError,
  isAuthError,
} from "./errors.js";
