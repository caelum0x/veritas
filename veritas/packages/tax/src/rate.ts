// Tax rate definitions by country and category.

import type { TaxCategory, TaxType } from "./tax.js";

export interface TaxRate {
  readonly country: string;
  readonly region?: string;
  readonly taxType: TaxType;
  readonly category: TaxCategory;
  readonly rate: number;
  readonly description: string;
}

// Standard VAT/GST rates by country (ISO 3166-1 alpha-2)
const BASE_RATES: readonly TaxRate[] = [
  // EU countries - VAT
  { country: "DE", taxType: "vat", category: "standard", rate: 0.19, description: "Germany standard VAT" },
  { country: "DE", taxType: "vat", category: "reduced", rate: 0.07, description: "Germany reduced VAT" },
  { country: "FR", taxType: "vat", category: "standard", rate: 0.20, description: "France standard VAT" },
  { country: "FR", taxType: "vat", category: "reduced", rate: 0.055, description: "France reduced VAT" },
  { country: "GB", taxType: "vat", category: "standard", rate: 0.20, description: "UK standard VAT" },
  { country: "GB", taxType: "vat", category: "reduced", rate: 0.05, description: "UK reduced VAT" },
  { country: "NL", taxType: "vat", category: "standard", rate: 0.21, description: "Netherlands standard VAT" },
  { country: "ES", taxType: "vat", category: "standard", rate: 0.21, description: "Spain standard VAT" },
  { country: "IT", taxType: "vat", category: "standard", rate: 0.22, description: "Italy standard VAT" },
  { country: "SE", taxType: "vat", category: "standard", rate: 0.25, description: "Sweden standard VAT" },
  { country: "PL", taxType: "vat", category: "standard", rate: 0.23, description: "Poland standard VAT" },
  // Non-EU Europe
  { country: "CH", taxType: "vat", category: "standard", rate: 0.077, description: "Switzerland standard VAT" },
  { country: "NO", taxType: "vat", category: "standard", rate: 0.25, description: "Norway standard VAT" },
  // Americas
  { country: "CA", taxType: "gst", category: "standard", rate: 0.05, description: "Canada federal GST" },
  { country: "AU", taxType: "gst", category: "standard", rate: 0.10, description: "Australia GST" },
  { country: "NZ", taxType: "gst", category: "standard", rate: 0.15, description: "New Zealand GST" },
  // Asia
  { country: "SG", taxType: "gst", category: "standard", rate: 0.09, description: "Singapore GST" },
  { country: "JP", taxType: "vat", category: "standard", rate: 0.10, description: "Japan consumption tax" },
  { country: "IN", taxType: "gst", category: "standard", rate: 0.18, description: "India GST standard" },
  { country: "IN", taxType: "gst", category: "digital_services", rate: 0.18, description: "India GST digital" },
  // Digital services specific
  { country: "DE", taxType: "vat", category: "digital_services", rate: 0.19, description: "Germany VAT digital" },
  { country: "FR", taxType: "vat", category: "digital_services", rate: 0.20, description: "France VAT digital" },
  // Zero-rated and exempt
  { country: "US", taxType: "sales_tax", category: "financial_services", rate: 0, description: "US financial services exempt" },
  { country: "US", taxType: "none", category: "exempt", rate: 0, description: "US tax-exempt" },
];

export function lookupRate(
  country: string,
  category: TaxCategory,
  region?: string,
): TaxRate {
  // Try region-specific first, then country-level
  const candidates = BASE_RATES.filter(
    (r) => r.country === country && r.category === category,
  );

  if (region) {
    const regional = candidates.find((r) => r.region === region);
    if (regional) return regional;
  }

  const match = candidates.find((r) => !r.region);
  if (match) return match;

  // Fallback: zero rate with "none" tax type
  return {
    country,
    taxType: "none",
    category,
    rate: 0,
    description: `No tax rate configured for ${country}/${category}`,
  };
}

export function getAllRates(): readonly TaxRate[] {
  return BASE_RATES;
}

export function getRatesForCountry(country: string): readonly TaxRate[] {
  return BASE_RATES.filter((r) => r.country === country);
}
