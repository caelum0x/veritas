// VAT-specific logic: validation, reverse-charge, and EU OSS handling.

import { z } from "zod";

export const VatNumberSchema = z.object({
  country: z.string().length(2),
  number: z.string().min(4).max(20),
  normalized: z.string(),
});

export type VatNumber = z.infer<typeof VatNumberSchema>;

// Basic format patterns per country (not an exhaustive VIES check — use mock provider for that)
const VAT_PATTERNS: Readonly<Record<string, RegExp>> = {
  DE: /^DE\d{9}$/,
  FR: /^FR[A-Z0-9]{2}\d{9}$/,
  GB: /^GB(\d{9}|\d{12}|GD\d{3}|HA\d{3})$/,
  NL: /^NL\d{9}B\d{2}$/,
  ES: /^ES[A-Z0-9]\d{7}[A-Z0-9]$/,
  IT: /^IT\d{11}$/,
  SE: /^SE\d{12}$/,
  PL: /^PL\d{10}$/,
  BE: /^BE0?\d{9}$/,
  AT: /^ATU\d{8}$/,
};

export interface VatParseResult {
  readonly valid: boolean;
  readonly vatNumber?: VatNumber;
  readonly error?: string;
}

export function parseVatNumber(raw: string): VatParseResult {
  const normalized = raw.replace(/\s|-/g, "").toUpperCase();
  if (normalized.length < 4) {
    return { valid: false, error: "VAT number too short" };
  }

  const country = normalized.slice(0, 2);
  const pattern = VAT_PATTERNS[country];

  if (pattern && !pattern.test(normalized)) {
    return { valid: false, error: `VAT number format invalid for country ${country}` };
  }

  return {
    valid: true,
    vatNumber: { country, number: normalized.slice(2), normalized },
  };
}

export interface VatApplicability {
  readonly applyVat: boolean;
  readonly reverseCharge: boolean;
  readonly rate: number;
  readonly reason: string;
}

export function determineVatApplicability(opts: {
  sellerCountry: string;
  buyerCountry: string;
  isB2B: boolean;
  buyerVatValid: boolean;
  rate: number;
}): VatApplicability {
  const { sellerCountry, buyerCountry, isB2B, buyerVatValid, rate } = opts;

  // Same country: always charge VAT at standard rate
  if (sellerCountry === buyerCountry) {
    return { applyVat: true, reverseCharge: false, rate, reason: "Domestic supply" };
  }

  // Cross-border B2B with valid VAT: reverse charge
  if (isB2B && buyerVatValid) {
    return {
      applyVat: false,
      reverseCharge: true,
      rate: 0,
      reason: "Cross-border B2B reverse charge",
    };
  }

  // Cross-border B2C: seller charges VAT at buyer's rate
  return {
    applyVat: true,
    reverseCharge: false,
    rate,
    reason: "Cross-border B2C: buyer-country rate applies",
  };
}

export function formatVatInvoiceLine(
  vatNumber: VatNumber,
  reverseCharge: boolean,
): string {
  const base = `VAT Reg. No: ${vatNumber.normalized}`;
  if (reverseCharge) {
    return `${base} — Reverse charge: VAT to be accounted for by the recipient`;
  }
  return base;
}
