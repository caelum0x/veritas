// Tax registration management: tracking per-jurisdiction registrations and tax numbers.

import { z } from "zod";
import { Result, ok, err, newId } from "@veritas/core";
import { TaxRegistrationStatusSchema, type TaxRegistrationStatus } from "./types.js";
import { RegistrationNotFoundError, InvalidTaxNumberError } from "./errors.js";

export const TaxRegistrationSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  jurisdictionCode: z.string().min(2).max(10),
  taxNumber: z.string().min(1),
  taxType: z.enum(["VAT", "GST", "SALES_TAX", "WITHHOLDING", "EXCISE"]),
  status: TaxRegistrationStatusSchema,
  registeredAt: z.string().datetime(),
  effectiveFrom: z.string().datetime(),
  effectiveUntil: z.string().datetime().optional(),
  filingFrequency: z.enum(["MONTHLY", "QUARTERLY", "ANNUALLY"]).optional(),
  notes: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type TaxRegistration = z.infer<typeof TaxRegistrationSchema>;

export const CreateRegistrationInputSchema = z.object({
  organizationId: z.string().min(1),
  jurisdictionCode: z.string().min(2).max(10),
  taxNumber: z.string().min(1),
  taxType: z.enum(["VAT", "GST", "SALES_TAX", "WITHHOLDING", "EXCISE"]),
  registeredAt: z.string().datetime(),
  effectiveFrom: z.string().datetime(),
  effectiveUntil: z.string().datetime().optional(),
  filingFrequency: z.enum(["MONTHLY", "QUARTERLY", "ANNUALLY"]).optional(),
  notes: z.string().optional(),
});
export type CreateRegistrationInput = z.infer<typeof CreateRegistrationInputSchema>;

/** Port interface for registration persistence. */
export interface RegistrationRepository {
  findById(id: string): Promise<TaxRegistration | null>;
  findByOrganization(organizationId: string): Promise<TaxRegistration[]>;
  findByJurisdiction(
    organizationId: string,
    jurisdictionCode: string
  ): Promise<TaxRegistration[]>;
  save(registration: TaxRegistration): Promise<void>;
  delete(id: string): Promise<void>;
}

/** Creates a new tax registration with generated id and timestamps. */
export function createRegistration(
  input: CreateRegistrationInput,
  now: Date = new Date()
): TaxRegistration {
  const iso = now.toISOString();
  return {
    id: newId("reg"),
    organizationId: input.organizationId,
    jurisdictionCode: input.jurisdictionCode,
    taxNumber: input.taxNumber,
    taxType: input.taxType,
    status: "PENDING" as TaxRegistrationStatus,
    registeredAt: input.registeredAt,
    effectiveFrom: input.effectiveFrom,
    effectiveUntil: input.effectiveUntil,
    filingFrequency: input.filingFrequency,
    notes: input.notes,
    createdAt: iso,
    updatedAt: iso,
  };
}

/** Activates a registration (immutable — returns a new record). */
export function activateRegistration(
  registration: TaxRegistration,
  now: Date = new Date()
): TaxRegistration {
  return { ...registration, status: "ACTIVE", updatedAt: now.toISOString() };
}

/** Suspends a registration (immutable — returns a new record). */
export function suspendRegistration(
  registration: TaxRegistration,
  now: Date = new Date()
): TaxRegistration {
  return { ...registration, status: "SUSPENDED", updatedAt: now.toISOString() };
}

/** Looks up a registration by id, returning a typed Result. */
export async function getRegistration(
  repo: RegistrationRepository,
  id: string
): Promise<Result<TaxRegistration, RegistrationNotFoundError>> {
  const reg = await repo.findById(id);
  if (reg == null) return err(new RegistrationNotFoundError(id));
  return ok(reg);
}

/** Basic format validation for a tax number given a jurisdiction. */
export function validateTaxNumberFormat(
  taxNumber: string,
  jurisdictionCode: string
): Result<true, InvalidTaxNumberError> {
  // EU VAT numbers: country prefix + 2-12 alphanumeric chars
  if (jurisdictionCode.length === 2) {
    const euPattern = /^[A-Z]{2}[0-9A-Z]{2,12}$/;
    if (["DE", "FR", "IT", "ES", "NL", "BE", "AT", "PL", "SE", "GB"].includes(jurisdictionCode)) {
      if (!euPattern.test(taxNumber.toUpperCase())) {
        return err(new InvalidTaxNumberError(taxNumber, jurisdictionCode));
      }
    }
  }
  if (taxNumber.trim().length < 4) {
    return err(new InvalidTaxNumberError(taxNumber, jurisdictionCode));
  }
  return ok(true);
}
