// Re-export the full public surface of the @veritas/trials module
export type {
  Trial,
  TrialId,
  TrialStatus,
  ReminderKind,
  CreateTrialParams,
  ExtendTrialParams,
  ConvertTrialParams,
  SendReminderParams,
} from "./types.js";

export { newTrialId } from "./types.js";

export {
  TrialNotFoundError,
  TrialAlreadyActiveError,
  TrialNotActiveError,
  TrialExtensionLimitError,
  ReminderAlreadySentError,
  InvalidExtensionDaysError,
} from "./errors.js";
