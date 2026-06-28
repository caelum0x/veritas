// Register LLM, verification engine, and CAP provider bindings onto the DI container.

import {
  Container,
  CAP_CONFIG,
  LLM_PROVIDER,
  LLM_REGISTRY,
  ENGINE_OPTIONS,
  VERIFICATION_CONFIG,
  CAP_PROVIDER,
  registerVerificationModule,
  registerCapModule,
} from "@veritas/container";

/** Register LLM and verification engine providers; conditionally wire CAP if configured. */
export function registerProviders(c: Container): void {
  registerVerificationModule(c);

  // Only wire CAP provider if a CAP config token has been pre-registered.
  if (c.has(CAP_CONFIG)) {
    registerCapModule(c);
  }
}

// Re-export tokens so callers can register CAP config externally if desired.
export {
  LLM_PROVIDER,
  LLM_REGISTRY,
  ENGINE_OPTIONS,
  VERIFICATION_CONFIG,
  CAP_PROVIDER,
  CAP_CONFIG,
};
