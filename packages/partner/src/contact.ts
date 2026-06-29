// contact.ts: partner contact persons — roles, records, and in-memory store.

import { z } from "zod";
import { newId, type Id, ok, err, type Result } from "@veritas/core";
import { PartnerNotFoundError, PartnerConflictError } from "./errors.js";

export type PartnerContactId = Id<"pcontact">;

export const ContactRoleSchema = z.enum([
  "primary",
  "technical",
  "billing",
  "legal",
  "support",
]);
export type ContactRole = z.infer<typeof ContactRoleSchema>;

export const PartnerContactSchema = z.object({
  id: z.string().startsWith("pcontact_"),
  partnerId: z.string().startsWith("partner_"),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().nullable(),
  role: ContactRoleSchema,
  isPrimary: z.boolean(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type PartnerContact = z.infer<typeof PartnerContactSchema>;

export const CreatePartnerContactSchema = z.object({
  partnerId: z.string().startsWith("partner_"),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().nullable().optional(),
  role: ContactRoleSchema,
  isPrimary: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type CreatePartnerContact = z.infer<typeof CreatePartnerContactSchema>;

export const UpdatePartnerContactSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().nullable().optional(),
  role: ContactRoleSchema.optional(),
  isPrimary: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type UpdatePartnerContact = z.infer<typeof UpdatePartnerContactSchema>;

export function makePartnerContact(input: CreatePartnerContact, now: string): PartnerContact {
  return {
    id: newId("pcontact") as string,
    partnerId: input.partnerId,
    name: input.name,
    email: input.email,
    phone: input.phone ?? null,
    role: input.role,
    isPrimary: input.isPrimary ?? false,
    metadata: input.metadata,
    createdAt: now,
    updatedAt: now,
  };
}

export function applyContactUpdate(
  contact: PartnerContact,
  update: UpdatePartnerContact,
  now: string,
): PartnerContact {
  return {
    ...contact,
    name: update.name ?? contact.name,
    email: update.email ?? contact.email,
    phone: update.phone !== undefined ? (update.phone ?? null) : contact.phone,
    role: update.role ?? contact.role,
    isPrimary: update.isPrimary ?? contact.isPrimary,
    metadata: update.metadata ?? contact.metadata,
    updatedAt: now,
  };
}

export interface PartnerContactStore {
  save(contact: PartnerContact): Promise<Result<PartnerContact>>;
  findById(id: string): Promise<Result<PartnerContact | null>>;
  findByPartnerId(partnerId: string): Promise<Result<readonly PartnerContact[]>>;
  findPrimary(partnerId: string): Promise<Result<PartnerContact | null>>;
  update(contact: PartnerContact): Promise<Result<PartnerContact>>;
  remove(id: string): Promise<Result<void>>;
}

export class InMemoryPartnerContactStore implements PartnerContactStore {
  private readonly records = new Map<string, PartnerContact>();

  async save(contact: PartnerContact): Promise<Result<PartnerContact>> {
    if (this.records.has(contact.id)) {
      return err(PartnerConflictError.of("PartnerContact", contact.id));
    }
    this.records.set(contact.id, contact);
    return ok(contact);
  }

  async findById(id: string): Promise<Result<PartnerContact | null>> {
    return ok(this.records.get(id) ?? null);
  }

  async findByPartnerId(partnerId: string): Promise<Result<readonly PartnerContact[]>> {
    return ok([...this.records.values()].filter((c) => c.partnerId === partnerId));
  }

  async findPrimary(partnerId: string): Promise<Result<PartnerContact | null>> {
    const found = [...this.records.values()].find((c) => c.partnerId === partnerId && c.isPrimary) ?? null;
    return ok(found);
  }

  async update(contact: PartnerContact): Promise<Result<PartnerContact>> {
    if (!this.records.has(contact.id)) {
      return err(PartnerNotFoundError.of("PartnerContact", contact.id));
    }
    this.records.set(contact.id, contact);
    return ok(contact);
  }

  async remove(id: string): Promise<Result<void>> {
    if (!this.records.has(id)) {
      return err(PartnerNotFoundError.of("PartnerContact", id));
    }
    this.records.delete(id);
    return ok(undefined);
  }
}
