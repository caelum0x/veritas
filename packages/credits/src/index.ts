// Public surface of the @veritas/credits package.

export {
  type CreditId,
  newCreditId,
  creditAmountSchema,
  type CreditAmount,
  CREDIT_MICRO_UNIT,
  toMicroUnits,
  fromMicroUnits,
  type CreditSource,
  creditSourceSchema,
  type Credit,
  creditSchema,
  makeCredit,
} from "./credit.js";

export {
  type CreditBalance,
  creditBalanceSchema,
  totalBalance,
  canAfford,
  zeroBalance,
  applyGrant,
  applyConsumption,
  applyExpiry,
  applyReservation,
  applyReservationRelease,
} from "./balance.js";

export {
  type GrantId,
  newGrantId,
  type CreditGrant,
  creditGrantSchema,
  type CreateGrantParams,
  makeGrant,
  deductFromGrant,
  isGrantExhausted,
  isGrantExpired,
  grantAvailable,
} from "./grant.js";

export {
  type LedgerEntryId,
  newLedgerEntryId,
  type LedgerEntryKind,
  ledgerEntryKindSchema,
  type LedgerEntry,
  ledgerEntrySchema,
  type CreateLedgerEntryParams,
  makeLedgerEntry,
  computeNetBalance,
  filterByKind,
  totalDebits,
  totalCredits,
} from "./ledger.js";

export {
  type ExpiryRecord,
  expiryRecordSchema,
  detectExpiredGrants,
  totalExpiredAmount,
  groupExpiryByUser,
  nextExpiryDate,
} from "./expiry.js";

export {
  InsufficientCreditsError,
  GrantNotFoundError,
  GrantExpiredError,
  GrantExhaustedError,
  ReservationNotFoundError,
  ReservationOverdrawError,
  CreditPolicyViolationError,
} from "./errors.js";

export {
  type CreditError,
  type GrantCreditsParams,
  type ConsumeCreditsParams,
  type ReserveCreditsParams,
  type ReleaseReservationParams,
  type CreditStore,
  type CreditNotifier,
  type CreditServiceDeps,
} from "./types.js";
