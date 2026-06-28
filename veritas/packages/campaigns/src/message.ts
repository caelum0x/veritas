// Campaign message: content management with optional multi-variant (A/B) support.

import { z } from "zod";
import { ok, err, newId, epochToIso, type Result } from "@veritas/core";
import { MessageVariantSchema, type MessageVariant } from "./types.js";
import { CampaignValidationError } from "./errors.js";

export const CampaignMessageSchema = z.object({
  id: z.string().min(1),
  orgId: z.string().min(1),
  name: z.string().min(1).max(200),
  variants: z.array(MessageVariantSchema).min(1),
  templateVars: z.array(z.string()).default([]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type CampaignMessage = z.infer<typeof CampaignMessageSchema>;

export const CreateMessageInputSchema = CampaignMessageSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type CreateMessageInput = z.infer<typeof CreateMessageInputSchema>;

/** Creates a new campaign message with one or more variants. */
export function createMessage(
  input: CreateMessageInput,
): Result<CampaignMessage, CampaignValidationError> {
  const parsed = CreateMessageInputSchema.safeParse(input);
  if (!parsed.success) {
    return err(
      new CampaignValidationError(
        parsed.error.issues.map((i) => i.message).join("; "),
      ),
    );
  }
  const normalised = normaliseWeights(parsed.data.variants);
  const now = epochToIso(Date.now());
  return ok({
    ...parsed.data,
    variants: [...normalised],
    id: newId("msg"),
    createdAt: now,
    updatedAt: now,
  });
}

/** Normalises variant weights so they sum to 100. */
function normaliseWeights(
  variants: ReadonlyArray<MessageVariant>,
): ReadonlyArray<MessageVariant> {
  const total = variants.reduce((s, v) => s + v.weight, 0);
  if (total === 0 || variants.length === 0) return variants;
  return variants.map((v) => ({ ...v, weight: (v.weight / total) * 100 }));
}

/** Replaces {{key}} placeholders in a template string with values. */
export function renderTemplate(
  template: string,
  vars: Readonly<Record<string, string>>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? `{{${key}}}`);
}

/** Renders a specific variant's subject and body with provided template vars. */
export function renderVariant(
  variant: MessageVariant,
  vars: Readonly<Record<string, string>>,
): { readonly subject: string; readonly body: string; readonly html?: string } {
  return {
    subject: renderTemplate(variant.subject, vars),
    body: renderTemplate(variant.body, vars),
    html: variant.html !== undefined ? renderTemplate(variant.html, vars) : undefined,
  };
}
