// Jurisdiction resolution: determines applicable tax jurisdiction from context.

import type { TaxContext, TaxType } from "./tax.js";

export interface JurisdictionResolution {
  readonly primaryJurisdiction: string;
  readonly region?: string;
  readonly taxType: TaxType;
  readonly isReverseCharge: boolean;
  readonly isDigitalServicesRule: boolean;
  readonly rationale: string;
}

// EU member states for reverse-charge and OSS rules
const EU_COUNTRIES = new Set([
  "AT","BE","BG","CY","CZ","DE","DK","EE","ES","FI","FR","GR","HR",
  "HU","IE","IT","LT","LU","LV","MT","NL","PL","PT","RO","SE","SI","SK",
]);

function isEU(country: string): boolean {
  return EU_COUNTRIES.has(country);
}

function taxTypeForCountry(country: string): TaxType {
  if (isEU(country) || ["GB","NO","CH","JP"].includes(country)) return "vat";
  if (["AU","NZ","SG","CA","IN"].includes(country)) return "gst";
  if (country === "US") return "sales_tax";
  return "none";
}

export function resolveJurisdiction(ctx: TaxContext): JurisdictionResolution {
  const { buyerCountry, buyerRegion, sellerCountry, isB2B, buyerVatNumber, category } = ctx;

  // B2B within EU with valid VAT number → reverse charge (buyer accounts for VAT)
  if (
    isB2B &&
    buyerVatNumber &&
    isEU(buyerCountry) &&
    isEU(sellerCountry) &&
    buyerCountry !== sellerCountry
  ) {
    return {
      primaryJurisdiction: buyerCountry,
      taxType: "vat",
      isReverseCharge: true,
      isDigitalServicesRule: false,
      rationale: "EU B2B cross-border: reverse charge applies; buyer accounts for VAT",
    };
  }

  // B2C digital services within EU → tax at buyer's country (OSS / MOSS rule)
  if (
    !isB2B &&
    category === "digital_services" &&
    isEU(buyerCountry) &&
    isEU(sellerCountry) &&
    buyerCountry !== sellerCountry
  ) {
    return {
      primaryJurisdiction: buyerCountry,
      region: buyerRegion,
      taxType: "vat",
      isReverseCharge: false,
      isDigitalServicesRule: true,
      rationale: "EU B2C digital services: taxed at buyer country under OSS rules",
    };
  }

  // US: sales tax is state-level; use buyer's region
  if (buyerCountry === "US") {
    return {
      primaryJurisdiction: buyerCountry,
      region: buyerRegion,
      taxType: "sales_tax",
      isReverseCharge: false,
      isDigitalServicesRule: false,
      rationale: buyerRegion
        ? `US sales tax: buyer state ${buyerRegion}`
        : "US sales tax: no state provided, no tax applied",
    };
  }

  // Default: tax in buyer's country
  return {
    primaryJurisdiction: buyerCountry,
    region: buyerRegion,
    taxType: taxTypeForCountry(buyerCountry),
    isReverseCharge: false,
    isDigitalServicesRule: false,
    rationale: `Standard taxation in buyer country ${buyerCountry}`,
  };
}
