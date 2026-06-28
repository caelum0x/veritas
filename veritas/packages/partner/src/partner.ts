// Partner organisation entity: represents an external company integrated with Veritas.

import { z } from "zod";
import { newId, type Id } from "@veritas/core";

export type PartnerId = Id<"partner">;

export function newPartnerId(): PartnerId {
  return newId("partner");
}

export const PartnerStatusSchema = z.enum(["pending", "active", "suspended", "terminated"]);
export type PartnerStatus = z.infer<typeof PartnerStatusSchema>;

export const PartnerSchema = z.object({
  id: z.string().startsWith("partner_"),
  name: z.string().min(1),
  slug: z.string().min(1),
  contactEmail: z.string().email(),
  websiteUrl: z.string().url().nullable(),
  status: PartnerStatusSchema,
  tierId: z.string().startsWith("ptier_"),
  organizationId: z.string().startsWith("org_"),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Partner = z.infer<typeof PartnerSchema>;

export const CreatePartnerSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  contactEmail: z.string().email(),
  websiteUrl: z.string().url().nullable().optional(),
  tierId: z.string().startsWith("ptier_"),
  organizationId: z.string().startsWith("org_"),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type CreatePartner = z.infer<typeof CreatePartnerSchema>;

export const UpdatePartnerSchema = z.object({
  name: z.string().min(1).optional(),
  contactEmail: z.string().email().optional(),
  websiteUrl: z.string().url().nullable().optional(),
  status: PartnerStatusSchema.optional(),
  tierId: z.string().startsWith("ptier_").optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type UpdatePartner = z.infer<typeof UpdatePartnerSchema>;

export function makePartner(
  input: CreatePartner,
  now: string,
): Partner {
  return {
    id: newPartnerId() as string,
    name: input.name,
    slug: input.slug,
    contactEmail: input.contactEmail,
    websiteUrl: input.websiteUrl ?? null,
    status: "pending",
    tierId: input.tierId,
    organizationId: input.organizationId,
    metadata: input.metadata,
    createdAt: now,
    updatedAt: now,
  };
}

export function applyPartnerUpdate(
  partner: Partner,
  update: UpdatePartner,
  now: string,
): Partner {
  return {
    ...partner,
    name: update.name ?? partner.name,
    contactEmail: update.contactEmail ?? partner.contactEmail,
    websiteUrl: update.websiteUrl !== undefined ? (update.websiteUrl ?? null) : partner.websiteUrl,
    status: update.status ?? partner.status,
    tierId: update.tierId ?? partner.tierId,
    metadata: update.metadata ?? partner.metadata,
    updatedAt: now,
  };
}
