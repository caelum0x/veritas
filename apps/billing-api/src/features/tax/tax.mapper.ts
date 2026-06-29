// Maps @veritas/tax domain objects to HTTP response shapes.

import type { TaxResult, TaxBreakdownLine } from "@veritas/tax";
import type { TaxRegistration } from "@veritas/tax";
import type { Exemption } from "@veritas/tax";

export interface TaxBreakdownLineDto {
  readonly taxType: string;
  readonly jurisdiction: string;
  readonly rate: number;
  readonly baseAmountBaseUnits: string;
  readonly taxAmountBaseUnits: string;
  readonly description?: string;
}

export interface TaxResultDto {
  readonly subtotalBaseUnits: string;
  readonly totalTaxBaseUnits: string;
  readonly totalWithTaxBaseUnits: string;
  readonly effectiveRate: number;
  readonly isExempt: boolean;
  readonly exemptionCode?: string;
  readonly currency: string;
  readonly lines: readonly TaxBreakdownLineDto[];
}

export interface TaxRegistrationDto {
  readonly id: string;
  readonly organizationId: string;
  readonly jurisdictionCode: string;
  readonly taxNumber: string;
  readonly taxType: string;
  readonly status: string;
  readonly registeredAt: string;
  readonly effectiveFrom: string;
  readonly effectiveUntil?: string;
  readonly filingFrequency?: string;
  readonly notes?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ExemptionDto {
  readonly id: string;
  readonly organizationId: string;
  readonly type: string;
  readonly jurisdictionCode: string;
  readonly certificateNumber?: string;
  readonly validFrom: string;
  readonly validUntil?: string;
  readonly documentUrl?: string;
  readonly notes?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

function mapLine(line: TaxBreakdownLine): TaxBreakdownLineDto {
  return {
    taxType: line.taxType,
    jurisdiction: line.jurisdiction,
    rate: line.rate,
    baseAmountBaseUnits: line.baseAmountBaseUnits.toString(),
    taxAmountBaseUnits: line.taxAmountBaseUnits.toString(),
    description: line.description,
  };
}

export function toTaxResultDto(result: TaxResult): TaxResultDto {
  return {
    subtotalBaseUnits: result.subtotalBaseUnits.toString(),
    totalTaxBaseUnits: result.totalTaxBaseUnits.toString(),
    totalWithTaxBaseUnits: result.totalWithTaxBaseUnits.toString(),
    effectiveRate: result.effectiveRate,
    isExempt: result.isExempt,
    exemptionCode: result.exemptionCode,
    currency: result.currency,
    lines: result.lines.map(mapLine),
  };
}

export function toTaxRegistrationDto(reg: TaxRegistration): TaxRegistrationDto {
  return {
    id: reg.id,
    organizationId: reg.organizationId,
    jurisdictionCode: reg.jurisdictionCode,
    taxNumber: reg.taxNumber,
    taxType: reg.taxType,
    status: reg.status,
    registeredAt: reg.registeredAt,
    effectiveFrom: reg.effectiveFrom,
    effectiveUntil: reg.effectiveUntil,
    filingFrequency: reg.filingFrequency,
    notes: reg.notes,
    createdAt: reg.createdAt,
    updatedAt: reg.updatedAt,
  };
}

export function toExemptionDto(exemption: Exemption): ExemptionDto {
  return {
    id: exemption.id,
    organizationId: exemption.organizationId,
    type: exemption.type,
    jurisdictionCode: exemption.jurisdictionCode,
    certificateNumber: exemption.certificateNumber,
    validFrom: exemption.validFrom,
    validUntil: exemption.validUntil,
    documentUrl: exemption.documentUrl,
    notes: exemption.notes,
    createdAt: exemption.createdAt,
    updatedAt: exemption.updatedAt,
  };
}
