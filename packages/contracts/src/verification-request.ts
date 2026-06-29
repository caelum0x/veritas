// Public verification request contract accepted by the engine/API/SDK.

import { z } from "zod";

export const VerificationOptionsSchema = z.object({
  allowedDomains: z.array(z.string().min(1)).optional(),
});
export type VerificationOptions = z.infer<typeof VerificationOptionsSchema>;

export const VerificationRequestSchema = z
  .object({
    claims: z.array(z.string().min(1)).optional(),
    text: z.string().optional(),
    context: z.string().optional(),
    options: VerificationOptionsSchema.optional(),
  })
  .refine(
    (req) =>
      (req.claims !== undefined && req.claims.length > 0) ||
      (req.text !== undefined && req.text.trim().length > 0),
    {
      message: "Provide either a non-empty `claims` array or non-empty `text`.",
      path: ["claims"],
    },
  );
export type VerificationRequest = z.infer<typeof VerificationRequestSchema>;
