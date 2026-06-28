// Shared types for data inventory and data flow mapping

import { z } from "zod";
import { ClassificationLevelSchema } from "./classification.js";

export const DataCategorySchema = z.enum([
  "pii",
  "financial",
  "health",
  "credential",
  "intellectual-property",
  "operational",
  "public",
]);
export type DataCategory = z.infer<typeof DataCategorySchema>;

export const AssetRetentionSchema = z.object({
  days: z.number().int().positive(),
  archiveAfterDays: z.number().int().positive().optional(),
  deleteAfterDays: z.number().int().positive().optional(),
});
export type AssetRetention = z.infer<typeof AssetRetentionSchema>;

export const DataAssetSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  classification: ClassificationLevelSchema,
  categories: z.array(DataCategorySchema).min(1),
  owner: z.string().min(1),
  tags: z.record(z.string()).default({}),
  retention: AssetRetentionSchema.optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type DataAsset = z.infer<typeof DataAssetSchema>;

export const CreateDataAssetSchema = DataAssetSchema.omit({
  createdAt: true,
  updatedAt: true,
});
export type CreateDataAsset = z.infer<typeof CreateDataAssetSchema>;

export const DataFlowDirectionSchema = z.enum(["inbound", "outbound", "internal"]);
export type DataFlowDirection = z.infer<typeof DataFlowDirectionSchema>;

export const DataFlowSchema = z.object({
  id: z.string().min(1),
  assetId: z.string().min(1),
  source: z.string().min(1),
  destination: z.string().min(1),
  direction: DataFlowDirectionSchema,
  classification: ClassificationLevelSchema,
  encrypted: z.boolean(),
  purpose: z.string().min(1),
  legalBasis: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type DataFlow = z.infer<typeof DataFlowSchema>;

export const CreateDataFlowSchema = DataFlowSchema.omit({
  createdAt: true,
  updatedAt: true,
});
export type CreateDataFlow = z.infer<typeof CreateDataFlowSchema>;
