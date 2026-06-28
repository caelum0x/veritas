// Branding options for export templates — logo, colours, and org identity
import { z } from "zod";

export const BrandingOptionsSchema = z.object({
  organizationName: z.string().min(1).default("Veritas"),
  logoUrl: z.string().url().optional(),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#1a56db"),
  secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#e1effe"),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#1e429f"),
  fontFamily: z.string().default("Inter, system-ui, sans-serif"),
  footerText: z.string().optional(),
  websiteUrl: z.string().url().optional(),
  tagline: z.string().optional(),
});

export type BrandingOptions = z.infer<typeof BrandingOptionsSchema>;

export const DEFAULT_BRANDING: BrandingOptions = {
  organizationName: "Veritas",
  primaryColor: "#1a56db",
  secondaryColor: "#e1effe",
  accentColor: "#1e429f",
  fontFamily: "Inter, system-ui, sans-serif",
};

export function resolveBranding(partial: Partial<BrandingOptions> | undefined): BrandingOptions {
  return BrandingOptionsSchema.parse({ ...DEFAULT_BRANDING, ...partial });
}

export function cssVariables(branding: BrandingOptions): string {
  return [
    `--color-primary: ${branding.primaryColor};`,
    `--color-secondary: ${branding.secondaryColor};`,
    `--color-accent: ${branding.accentColor};`,
    `--font-family: ${branding.fontFamily};`,
  ].join("\n    ");
}
