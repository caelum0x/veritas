// Default in-memory wiring: builds a fully-configured Container using only in-memory adapters.

import { Container, buildContainer } from "@veritas/container";
import { registerObservability } from "./register-observability.js";

/**
 * Build a default Container with all in-memory repositories and services registered.
 * Suitable for testing, local development, and environments without a real database.
 */
export function buildDefaultContainer(): Container {
  // buildContainer from @veritas/container already wires persistence + services + LLM mock.
  const container = buildContainer();

  // Layer in the observability stack on top of the base wiring.
  registerObservability(container);

  return container;
}
