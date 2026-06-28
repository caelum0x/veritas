// Public surface of @veritas/affiliates: re-exports all sub-modules.

// Canonical entity types live in their domain modules (affiliate/link/payout/
// commission/statement); types.js only contributes the remaining shared types.
export {
  AttributionModel,
  AttributionWindow,
  AttributionWindowSchema,
  ClickEvent,
  ClickId,
  Commission,
  CommissionId,
  CommissionRate,
  CommissionRateSchema,
  CommissionStatus,
  CommissionTier,
  CreateLink,
  CreateLinkSchema,
  CreatePayout,
  CreatePayoutSchema,
  LinkId,
  StatementId,
} from "./types.js";
export * from "./errors.js";
export * from "./tier.js";
export * from "./affiliate.js";
export * from "./link.js";
export * from "./commission.js";
export * from "./attribution.js";
export * from "./tracking.js";
export * from "./payout.js";
export * from "./statement.js";
export * from "./store.js";
