// Maps Service domain objects to/from persistence row representation.

import type { Service, CreateService, UpdateService } from "@veritas/contracts";
import { newId, epochToIso, isoToEpoch } from "@veritas/core";

/** Persistence row shape for Service. */
export interface ServiceRow {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly description: string;
  readonly basePriceAmount: string;
  readonly basePriceCurrency: string;
  readonly active: boolean;
  readonly inputSchemaRef: string | null;
  readonly outputSchemaRef: string | null;
  readonly metadata: Record<string, unknown> | undefined;
  readonly createdAt: number;
  readonly updatedAt: number;
}

/** Map a persistence row to a Service domain object. */
export function toServiceDomain(row: ServiceRow): Service {
  return {
    id: row.id as Service["id"],
    slug: row.slug,
    name: row.name,
    description: row.description,
    basePrice: { amount: row.basePriceAmount, currency: row.basePriceCurrency as "USDC" },
    active: row.active,
    inputSchemaRef: row.inputSchemaRef,
    outputSchemaRef: row.outputSchemaRef,
    metadata: row.metadata,
    createdAt: epochToIso(row.createdAt),
    updatedAt: epochToIso(row.updatedAt),
  };
}

/** Map CreateService DTO to a ServiceRow ready for storage. */
export function toServiceRow(dto: CreateService): ServiceRow {
  const now = Date.now();
  return {
    id: newId("svc"),
    slug: dto.slug,
    name: dto.name,
    description: dto.description,
    basePriceAmount: dto.basePrice.amount,
    basePriceCurrency: dto.basePrice.currency,
    active: dto.active ?? true,
    inputSchemaRef: dto.inputSchemaRef ?? null,
    outputSchemaRef: dto.outputSchemaRef ?? null,
    metadata: dto.metadata,
    createdAt: now,
    updatedAt: now,
  };
}

/** Merge an UpdateService DTO into an existing ServiceRow, returning a new row. */
export function mergeServiceRow(existing: ServiceRow, dto: UpdateService): ServiceRow {
  return {
    ...existing,
    slug: dto.slug ?? existing.slug,
    name: dto.name ?? existing.name,
    description: dto.description ?? existing.description,
    basePriceAmount: dto.basePrice?.amount ?? existing.basePriceAmount,
    basePriceCurrency: dto.basePrice?.currency ?? existing.basePriceCurrency,
    active: dto.active ?? existing.active,
    inputSchemaRef: dto.inputSchemaRef !== undefined ? dto.inputSchemaRef : existing.inputSchemaRef,
    outputSchemaRef: dto.outputSchemaRef !== undefined ? dto.outputSchemaRef : existing.outputSchemaRef,
    metadata: dto.metadata ?? existing.metadata,
    updatedAt: Date.now(),
  };
}

/** Map a Service domain object back to a persistence row. */
export function fromServiceDomain(service: Service): ServiceRow {
  return {
    id: service.id,
    slug: service.slug,
    name: service.name,
    description: service.description,
    basePriceAmount: service.basePrice.amount,
    basePriceCurrency: service.basePrice.currency,
    active: service.active,
    inputSchemaRef: service.inputSchemaRef,
    outputSchemaRef: service.outputSchemaRef,
    metadata: service.metadata,
    createdAt: isoToEpoch(service.createdAt) ?? 0,
    updatedAt: isoToEpoch(service.updatedAt) ?? 0,
  };
}
