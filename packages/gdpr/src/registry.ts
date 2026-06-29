// Data inventory registry: catalogue processing activities and personal data categories per GDPR Art. 30.

import { z } from "zod";
import { type Result, ok, err } from "@veritas/core";
import { type Id, newId } from "@veritas/core";
import { epochToIso } from "@veritas/core";
import { MemoryStore } from "@veritas/persistence";
import { type LawfulBasisCode, LawfulBasisCodeSchema } from "./lawful-basis.js";

export type RegistryEntryId = Id<"regentry">;
export const newRegistryEntryId = (): RegistryEntryId => newId("regentry");

export const DataCategorySchema = z.enum([
  "identity",
  "contact",
  "financial",
  "health",
  "biometric",
  "location",
  "behavioral",
  "communications",
  "sensitive_special_category",
  "professional",
]);
export type DataCategory = z.infer<typeof DataCategorySchema>;

export const RetentionPolicySchema = z.object({
  durationDays: z.number().int().positive(),
  basis: z.string(),
  reviewDate: z.string().nullable(),
});
export type RetentionPolicy = z.infer<typeof RetentionPolicySchema>;

export const RegistryEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  lawfulBasis: LawfulBasisCodeSchema,
  dataCategories: z.array(DataCategorySchema),
  dataSubjectTypes: z.array(z.string()),
  purposes: z.array(z.string()),
  recipients: z.array(z.string()),
  thirdCountryTransfers: z.boolean(),
  safeguards: z.array(z.string()),
  retentionPolicy: RetentionPolicySchema,
  controllerName: z.string(),
  dpoContact: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type RegistryEntry = z.infer<typeof RegistryEntrySchema>;

export interface CreateRegistryEntryInput {
  readonly name: string;
  readonly description: string;
  readonly lawfulBasis: LawfulBasisCode;
  readonly dataCategories: DataCategory[];
  readonly dataSubjectTypes: string[];
  readonly purposes: string[];
  readonly recipients?: string[];
  readonly thirdCountryTransfers?: boolean;
  readonly safeguards?: string[];
  readonly retentionPolicy: RetentionPolicy;
  readonly controllerName: string;
  readonly dpoContact?: string;
}

export interface DataInventoryRegistry {
  add(input: CreateRegistryEntryInput): Result<RegistryEntry>;
  update(id: string, patch: Partial<CreateRegistryEntryInput>): Result<RegistryEntry>;
  remove(id: string): Result<void>;
  findById(id: string): RegistryEntry | undefined;
  findByLawfulBasis(basis: LawfulBasisCode): RegistryEntry[];
  findByDataCategory(category: DataCategory): RegistryEntry[];
  list(): RegistryEntry[];
}

export class InMemoryDataInventoryRegistry implements DataInventoryRegistry {
  private readonly store = new MemoryStore<RegistryEntry & { readonly id: string }>();

  add(input: CreateRegistryEntryInput): Result<RegistryEntry> {
    const now = epochToIso(Date.now());
    const entry: RegistryEntry = {
      id: newRegistryEntryId(),
      name: input.name,
      description: input.description,
      lawfulBasis: input.lawfulBasis,
      dataCategories: [...input.dataCategories],
      dataSubjectTypes: [...input.dataSubjectTypes],
      purposes: [...input.purposes],
      recipients: input.recipients !== undefined ? [...input.recipients] : [],
      thirdCountryTransfers: input.thirdCountryTransfers ?? false,
      safeguards: input.safeguards !== undefined ? [...input.safeguards] : [],
      retentionPolicy: { ...input.retentionPolicy },
      controllerName: input.controllerName,
      dpoContact: input.dpoContact ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.store.set(entry);
    return ok(entry);
  }

  update(id: string, patch: Partial<CreateRegistryEntryInput>): Result<RegistryEntry> {
    const existing = this.store.get(id);
    if (existing === undefined) {
      return err(new Error(`Registry entry not found: ${id}`));
    }
    const now = epochToIso(Date.now());
    const updated: RegistryEntry = {
      ...existing,
      ...patch,
      dataCategories: patch.dataCategories !== undefined ? [...patch.dataCategories] : existing.dataCategories,
      dataSubjectTypes: patch.dataSubjectTypes !== undefined ? [...patch.dataSubjectTypes] : existing.dataSubjectTypes,
      purposes: patch.purposes !== undefined ? [...patch.purposes] : existing.purposes,
      recipients: patch.recipients !== undefined ? [...patch.recipients] : existing.recipients,
      safeguards: patch.safeguards !== undefined ? [...patch.safeguards] : existing.safeguards,
      retentionPolicy: patch.retentionPolicy !== undefined ? { ...patch.retentionPolicy } : existing.retentionPolicy,
      updatedAt: now,
    };
    this.store.set(updated);
    return ok(updated);
  }

  remove(id: string): Result<void> {
    if (!this.store.has(id)) {
      return err(new Error(`Registry entry not found: ${id}`));
    }
    this.store.delete(id);
    return ok(undefined);
  }

  findById(id: string): RegistryEntry | undefined {
    return this.store.get(id);
  }

  findByLawfulBasis(basis: LawfulBasisCode): RegistryEntry[] {
    return this.store.all().filter((e) => e.lawfulBasis === basis);
  }

  findByDataCategory(category: DataCategory): RegistryEntry[] {
    return this.store.all().filter((e) => e.dataCategories.includes(category));
  }

  list(): RegistryEntry[] {
    return this.store.all();
  }
}
