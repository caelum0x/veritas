// Public surface of @veritas/wiring — integration-layer container composition utilities.

export { registerObservability } from "./register-observability.js";
export { buildDefaultContainer } from "./defaults.js";
export { WiringError, ConfigurationError, ProviderInitError } from "./errors.js";
export {
  WIRING_LOGGER,
  WIRING_METRICS,
  WIRING_TRACER,
  WIRING_AUDIT,
  WIRING_CONFIG,
  type WiringToken,
} from "./tokens.js";
