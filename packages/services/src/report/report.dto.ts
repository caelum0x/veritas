// DTOs for report use-cases: query inputs and projected response shapes.
import { z } from "zod";

/** Input DTO for fetching a single report by its ID. */
export const GetReportByIdInputSchema = z.object({
  reportId: z.string().min(1),
});
export type GetReportByIdInput = z.infer<typeof GetReportByIdInputSchema>;

/** Input DTO for fetching the report linked to a verification run. */
export const GetReportByVerificationIdInputSchema = z.object({
  verificationId: z.string().min(1),
});
export type GetReportByVerificationIdInput = z.infer<
  typeof GetReportByVerificationIdInputSchema
>;

/** Input DTO for listing reports with optional verification filter and pagination. */
export const ListReportsInputSchema = z.object({
  verificationId: z.string().min(1).optional(),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(20),
});
export type ListReportsInput = z.infer<typeof ListReportsInputSchema>;

/** Input DTO for deleting a report. */
export const DeleteReportInputSchema = z.object({
  reportId: z.string().min(1),
});
export type DeleteReportInput = z.infer<typeof DeleteReportInputSchema>;

/** Verdict-count projection embedded in ReportView. */
export interface ReportVerdictCountsView {
  readonly supported: number;
  readonly refuted: number;
  readonly unverifiable: number;
}

/** Claim-level projection embedded in ReportView. */
export interface ReportClaimView {
  readonly claim: string;
  readonly verdict: string;
  readonly confidence: number;
  readonly reasoning: string;
  readonly citationIds: string[];
}

/** Lightweight report projection returned to callers. */
export interface ReportView {
  readonly id: string;
  readonly verificationId: string;
  readonly contentHash: string;
  readonly summary: string;
  readonly trustScore: number;
  readonly counts: ReportVerdictCountsView;
  readonly claims: ReportClaimView[];
  readonly createdAt: string;
  readonly updatedAt: string;
}
