// Public surface of @veritas/privacy — re-exports all privacy module symbols
export type {
  PrivacyField,
  AnonymizationStrategy,
  GeneralizationRule,
  SuppressionRule,
  PrivacyBudget,
  BudgetConsumption,
  DataRecord,
  KAnonymityConfig,
} from "./types.js";

export {
  PrivacyFieldSchema,
  AnonymizationStrategySchema,
  GeneralizationRuleSchema,
  SuppressionRuleSchema,
  PrivacyBudgetSchema,
  BudgetConsumptionSchema,
  KAnonymityConfigSchema,
} from "./types.js";

export { anonymizeRecord, anonymizeDataset, type AnonymizeOptions } from "./anonymize.js";
export { pseudonymizeRecord, pseudonymizeDataset, type PseudonymizeOptions } from "./pseudonymize.js";
export { checkKAnonymity, enforceKAnonymity } from "./k-anonymity.js";
export { createDifferentialPrivacyMechanism, type DifferentialPrivacyMechanism } from "./differential.js";
export { laplaceNoise, gaussianNoise } from "./noise.js";
export { generalizeField, generalizeRecord } from "./generalize.js";
export { suppressField, suppressRecord } from "./suppression.js";
export {
  createPrivacyBudget,
  consumeBudget,
  getRemainingBudget,
  isBudgetExhausted,
} from "./budget.js";
export {
  PrivacyError,
  BudgetExhaustedError,
  KAnonymityViolationError,
  PrivacyConfigError,
} from "./errors.js";
