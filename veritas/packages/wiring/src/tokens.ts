// Integration DI tokens — additional symbols for wiring-layer registrations not covered by @veritas/container.

import type { Logger } from "@veritas/observability";
import type { MetricsRegistry } from "@veritas/observability";
import type { Tracer } from "@veritas/observability";
import type { AuditLogger } from "@veritas/observability";
import type { AppConfig } from "@veritas/config";

/** Typed injection token. */
export type WiringToken<_T> = symbol;

function wiringToken<T>(name: string): WiringToken<T> {
  return Symbol(`wiring:${name}`);
}

// ── Observability tokens ──────────────────────────────────────────────────────
export const WIRING_LOGGER  = wiringToken<Logger>("Logger");
export const WIRING_METRICS = wiringToken<MetricsRegistry>("MetricsRegistry");
export const WIRING_TRACER  = wiringToken<Tracer>("Tracer");
export const WIRING_AUDIT   = wiringToken<AuditLogger>("AuditLogger");

// ── Config token ─────────────────────────────────────────────────────────────
export const WIRING_CONFIG  = wiringToken<AppConfig>("AppConfig");
