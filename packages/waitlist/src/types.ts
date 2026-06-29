// Shared types for the waitlist module
import { z } from "zod";

export const WaitlistStatusSchema = z.enum(["pending", "invited", "accepted", "declined", "expired"]);
export type WaitlistStatus = z.infer<typeof WaitlistStatusSchema>;

export const WaitlistEntrySchema = z.object({
  id: z.string(),
  waitlistId: z.string(),
  email: z.string().email(),
  name: z.string().optional(),
  referralCode: z.string(),
  referredByCode: z.string().optional(),
  position: z.number().int().positive(),
  boostPoints: z.number().int().min(0).default(0),
  status: WaitlistStatusSchema,
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  invitedAt: z.string().optional(),
  acceptedAt: z.string().optional(),
});
export type WaitlistEntry = z.infer<typeof WaitlistEntrySchema>;

export const WaitlistSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  slug: z.string(),
  isOpen: z.boolean().default(true),
  maxCapacity: z.number().int().positive().optional(),
  referralBoostPoints: z.number().int().min(0).default(5),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Waitlist = z.infer<typeof WaitlistSchema>;

export const InviteSchema = z.object({
  id: z.string(),
  waitlistId: z.string(),
  entryId: z.string(),
  email: z.string().email(),
  token: z.string(),
  expiresAt: z.string(),
  usedAt: z.string().optional(),
  createdAt: z.string(),
});
export type Invite = z.infer<typeof InviteSchema>;
