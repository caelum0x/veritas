// Public surface re-export for @veritas/cli
export type { Command, CommandContext, CommandResult } from "./command.js";
export { loadCliConfig, DEFAULT_API_URL, CONFIG_ENV_PREFIX } from "./config.js";
export type { CliConfig } from "./config.js";
export { createSpinner } from "./spinner.js";
export type { Spinner } from "./spinner.js";
export {
  CliError,
  ConfigError,
  ApiError,
  NotFoundCliError,
  UnauthorizedCliError,
  formatError,
  exitCodeFrom,
} from "./errors.js";
export { globalHelp, commandHelp, versionText } from "./help.js";
