// Billing, subscription, and payment configuration section
import { z } from "zod";

export const StripeConfigSchema = z.object({
  /** Stripe secret key (sk_live_... or sk_test_...) */
  secretKey: z.string().min(1),
  /** Stripe publishable key for client-side use */
  publishableKey: z.string().min(1),
  /** Webhook signing secret for verifying incoming Stripe events */
  webhookSecret: z.string().min(1),
  /** Stripe API version to pin */
  apiVersion: z.string().default("2023-10-16"),
});

export const UsageBillingConfigSchema = z.object({
  /** Price per verification in USDC micro-units (6 decimals) */
  pricePerVerificationUsdc: z.number().int().nonnegative().default(500_000),
  /** Price per 1,000 API calls in USDC micro-units */
  pricePer1kCallsUsdc: z.number().int().nonnegative().default(1_000_000),
  /** Free tier monthly verification allowance */
  freeMonthlyVerifications: z.number().int().nonnegative().default(10),
  /** Grace period in milliseconds after invoice due before suspension */
  gracePeriodMs: z.number().int().nonnegative().default(7 * 24 * 60 * 60 * 1000),
});

export const BillingConfigSchema = z.object({
  /** Stripe payment provider settings */
  stripe: StripeConfigSchema,
  /** Usage-based pricing parameters */
  usage: UsageBillingConfigSchema.default({}),
  /** Currency code for fiat invoices */
  currency: z.string().length(3).default("usd"),
  /** Billing cycle anchor day of month (1–28) */
  billingDayOfMonth: z.number().int().min(1).max(28).default(1),
  /** Whether to enable automatic invoice collection */
  autoCollect: z.boolean().default(true),
  /** Minimum invoice amount in cents to trigger a charge */
  minimumChargeAmountCents: z.number().int().nonnegative().default(50),
  /** Tax rate to apply to invoices (0.0–1.0) */
  taxRate: z.number().min(0).max(1).default(0),
});

export type StripeConfig = z.infer<typeof StripeConfigSchema>;
export type UsageBillingConfig = z.infer<typeof UsageBillingConfigSchema>;
export type BillingConfig = z.infer<typeof BillingConfigSchema>;

export const billingDefaults: Partial<BillingConfig> = {
  currency: "usd",
  billingDayOfMonth: 1,
  autoCollect: true,
  minimumChargeAmountCents: 50,
  taxRate: 0,
};
