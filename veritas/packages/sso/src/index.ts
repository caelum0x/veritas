// Public surface of @veritas/sso — re-exports all stable module exports.

// Types
export type {
  SsoProtocol,
  IdpAttributes,
  SsoPrincipal,
  SsoSession,
  BaseProviderConfig,
  CallbackResult,
  JitProvisioningConfig,
} from "./types.js";
export {
  SsoProtocolSchema,
  BaseProviderConfigSchema,
  JitProvisioningConfigSchema,
} from "./types.js";

// Provider port
export type {
  ProviderProtocol,
  IdentityAssertion,
  ProviderConfig,
  LoginOptions,
  LoginRedirect,
  CallbackParams,
  IdpProvider,
} from "./provider.js";

// Attribute mapping
export type { AttributeMap } from "./attribute-mapping.js";
export {
  AttributeMapSchema,
  DEFAULT_ATTRIBUTE_MAP,
  mapAttributes,
  mergeAttributeMap,
} from "./attribute-mapping.js";

// Errors
export type { ProviderError } from "./errors.js";
export {
  SsoError,
  ProviderNotFoundError,
  InvalidStateError,
  AssertionValidationError,
  TokenExchangeError,
  AttributeMappingError,
  JitProvisioningError,
  CallbackError,
} from "./errors.js";

// State management
export type { OAuthState, StateStore } from "./state.js";
export {
  createInMemoryStateStore,
  createState,
  consumeState,
} from "./state.js";

// Provider registry
export type { ProviderRegistry } from "./registry.js";
export { createProviderRegistry } from "./registry.js";

// Callback handler
export type { CallbackRequest, CallbackOutcome } from "./callback.js";
export { handleSsoCallback, formatCallbackError } from "./callback.js";
