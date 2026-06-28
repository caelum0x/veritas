// Zod schemas for referrals feature HTTP request/response validation.
import { z } from "zod";
import { CreateProgramSchema, AttributionRequestSchema } from "@veritas/referrals";

export const CreateProgramBodySchema = CreateProgramSchema;
export type CreateProgramBody = z.infer<typeof CreateProgramBodySchema>;

export const RegisterClickBodySchema = z.object({
  programId: z.string().min(1),
  referrerId: z.string().min(1),
  code: z.string().min(1),
  ip: z.string().optional(),
  userAgent: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type RegisterClickBody = z.infer<typeof RegisterClickBodySchema>;

export const AttributeSignupBodySchema = z.object({
  referralId: z.string().min(1),
  request: AttributionRequestSchema,
  fraudSignals: z.object({
    isSelfReferral: z.boolean().default(false),
    isDuplicateReferee: z.boolean().default(false),
    suspiciousIp: z.boolean().default(false),
    reason: z.string().optional(),
  }).default({ isSelfReferral: false, isDuplicateReferee: false, suspiciousIp: false }),
});
export type AttributeSignupBody = z.infer<typeof AttributeSignupBodySchema>;

export const IssueRewardsParamsSchema = z.object({
  referralId: z.string().min(1),
});
export type IssueRewardsParams = z.infer<typeof IssueRewardsParamsSchema>;

export const ListByReferrerParamsSchema = z.object({
  referrerId: z.string().min(1),
});
export type ListByReferrerParams = z.infer<typeof ListByReferrerParamsSchema>;

export const ListByReferrerQuerySchema = z.object({
  programId: z.string().min(1).optional(),
});
export type ListByReferrerQuery = z.infer<typeof ListByReferrerQuerySchema>;

export const GenerateCodeParamsSchema = z.object({
  userId: z.string().min(1),
});
export type GenerateCodeParams = z.infer<typeof GenerateCodeParamsSchema>;

export const GetProgramParamsSchema = z.object({
  programId: z.string().min(1),
});
export type GetProgramParams = z.infer<typeof GetProgramParamsSchema>;
