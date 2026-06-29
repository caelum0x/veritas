// Attribution window management: determines if a click qualifies for commission on a sale.

import { ok, err, type Result } from "@veritas/core";
import { AttributionWindowExpiredError } from "./errors.js";

/** Default attribution window in days. */
export const DEFAULT_ATTRIBUTION_WINDOW_DAYS = 30;

/** Configuration for the attribution window. */
export interface AttributionWindowConfig {
  readonly windowDays: number;
}

/** Result of an attribution check. */
export interface AttributionResult {
  readonly clickId: string;
  readonly affiliateId: string;
  readonly linkId: string;
  readonly clickedAt: string;
  readonly saleAt: string;
  readonly windowDays: number;
  readonly elapsedMs: number;
  readonly qualified: boolean;
}

/** Minimal click data needed for attribution checks. */
export interface AttributableClick {
  readonly id: string;
  readonly affiliateId: string;
  readonly linkId: string;
  readonly clickedAt: string;
}

/**
 * Checks whether a click falls within the attribution window relative to the sale timestamp.
 * Returns an AttributionResult wrapped in Ok, or an AttributionWindowExpiredError in Err.
 */
export function checkAttribution(
  click: AttributableClick,
  saleAt: string,
  config: AttributionWindowConfig = { windowDays: DEFAULT_ATTRIBUTION_WINDOW_DAYS }
): Result<AttributionResult> {
  const clickedMs = new Date(click.clickedAt).getTime();
  const saleMs = new Date(saleAt).getTime();
  const elapsedMs = saleMs - clickedMs;
  const windowMs = config.windowDays * 24 * 60 * 60 * 1000;
  const qualified = elapsedMs >= 0 && elapsedMs <= windowMs;

  const result: AttributionResult = {
    clickId: click.id,
    affiliateId: click.affiliateId,
    linkId: click.linkId,
    clickedAt: click.clickedAt,
    saleAt,
    windowDays: config.windowDays,
    elapsedMs,
    qualified,
  };

  if (!qualified) {
    return err(new AttributionWindowExpiredError(click.id, config.windowDays));
  }

  return ok(result);
}

/**
 * Given multiple clicks, selects the most recent qualifying click within the attribution window.
 * Implements last-click attribution model.
 */
export function selectAttributableClick(
  clicks: readonly AttributableClick[],
  saleAt: string,
  config: AttributionWindowConfig = { windowDays: DEFAULT_ATTRIBUTION_WINDOW_DAYS }
): AttributableClick | undefined {
  const saleMs = new Date(saleAt).getTime();
  const windowMs = config.windowDays * 24 * 60 * 60 * 1000;

  const qualifying = clicks.filter((click) => {
    const clickedMs = new Date(click.clickedAt).getTime();
    const elapsed = saleMs - clickedMs;
    return elapsed >= 0 && elapsed <= windowMs;
  });

  if (qualifying.length === 0) return undefined;

  return qualifying.reduce((latest, click) =>
    new Date(click.clickedAt) > new Date(latest.clickedAt) ? click : latest
  );
}

/** Returns the expiry timestamp string for a click given the window config. */
export function computeWindowExpiry(
  clickedAt: string,
  config: AttributionWindowConfig = { windowDays: DEFAULT_ATTRIBUTION_WINDOW_DAYS }
): string {
  const clickedMs = new Date(clickedAt).getTime();
  const expiryMs = clickedMs + config.windowDays * 24 * 60 * 60 * 1000;
  return new Date(expiryMs).toISOString();
}

/** Returns true if the attribution window for a click has not yet expired. */
export function isWindowOpen(
  clickedAt: string,
  nowIso: string,
  config: AttributionWindowConfig = { windowDays: DEFAULT_ATTRIBUTION_WINDOW_DAYS }
): boolean {
  const expiryMs = new Date(computeWindowExpiry(clickedAt, config)).getTime();
  return new Date(nowIso).getTime() <= expiryMs;
}
