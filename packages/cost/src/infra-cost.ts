// Infra cost model: compute, storage, network unit pricing and cost calculation
import { z } from "zod";
import type { IsoTimestamp } from "@veritas/core";
import { asIsoTimestamp } from "@veritas/core";

export const InfraResourceKindSchema = z.enum([
  "compute",
  "storage",
  "network_egress",
  "database",
  "cache",
  "queue",
  "cdn",
]);
export type InfraResourceKind = z.infer<typeof InfraResourceKindSchema>;

export const InfraUnitPriceSchema = z.object({
  kind: InfraResourceKindSchema,
  region: z.string().min(1),
  unitLabel: z.string().min(1),
  pricePerUnitUsdc: z.number().nonnegative(),
});
export type InfraUnitPrice = z.infer<typeof InfraUnitPriceSchema>;

export const InfraUsageSchema = z.object({
  kind: InfraResourceKindSchema,
  region: z.string().min(1),
  units: z.number().nonnegative(),
  recordedAt: z.string().datetime(),
});
export type InfraUsage = z.infer<typeof InfraUsageSchema>;

export const InfraCostLineSchema = z.object({
  kind: InfraResourceKindSchema,
  region: z.string().min(1),
  units: z.number().nonnegative(),
  unitLabel: z.string().min(1),
  pricePerUnitUsdc: z.number().nonnegative(),
  totalUsdc: z.number().nonnegative(),
  recordedAt: z.string().datetime(),
});
export type InfraCostLine = z.infer<typeof InfraCostLineSchema>;

/** Default unit prices keyed by kind (USD-cents expressed as USDC micro-units). */
const DEFAULT_PRICES: Record<InfraResourceKind, Omit<InfraUnitPrice, "region">> = {
  compute: { kind: "compute", unitLabel: "vCPU-hour", pricePerUnitUsdc: 0.048 },
  storage: { kind: "storage", unitLabel: "GB-month", pricePerUnitUsdc: 0.023 },
  network_egress: { kind: "network_egress", unitLabel: "GB", pricePerUnitUsdc: 0.09 },
  database: { kind: "database", unitLabel: "vCPU-hour", pricePerUnitUsdc: 0.17 },
  cache: { kind: "cache", unitLabel: "GB-hour", pricePerUnitUsdc: 0.015 },
  queue: { kind: "queue", unitLabel: "million-ops", pricePerUnitUsdc: 0.0004 },
  cdn: { kind: "cdn", unitLabel: "GB", pricePerUnitUsdc: 0.0085 },
};

export interface InfraCostModel {
  price(kind: InfraResourceKind, region: string): InfraUnitPrice;
  calculate(usage: InfraUsage): InfraCostLine;
  setPrice(price: InfraUnitPrice): void;
}

export function createInfraCostModel(overrides: InfraUnitPrice[] = []): InfraCostModel {
  const priceMap = new Map<string, InfraUnitPrice>();

  for (const [kind, defaults] of Object.entries(DEFAULT_PRICES)) {
    const key = `${kind}:*`;
    priceMap.set(key, { ...defaults, region: "*" });
  }

  for (const p of overrides) {
    priceMap.set(`${p.kind}:${p.region}`, p);
  }

  function price(kind: InfraResourceKind, region: string): InfraUnitPrice {
    return (
      priceMap.get(`${kind}:${region}`) ??
      priceMap.get(`${kind}:*`) ?? {
        kind,
        region,
        unitLabel: "unit",
        pricePerUnitUsdc: 0,
      }
    );
  }

  function calculate(usage: InfraUsage): InfraCostLine {
    const p = price(usage.kind, usage.region);
    return {
      kind: usage.kind,
      region: usage.region,
      units: usage.units,
      unitLabel: p.unitLabel,
      pricePerUnitUsdc: p.pricePerUnitUsdc,
      totalUsdc: usage.units * p.pricePerUnitUsdc,
      recordedAt: usage.recordedAt,
    };
  }

  function setPrice(p: InfraUnitPrice): void {
    priceMap.set(`${p.kind}:${p.region}`, p);
  }

  return { price, calculate, setPrice };
}
