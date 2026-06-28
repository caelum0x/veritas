// FlagProvider interface for pluggable flag storage backends

import type { FeatureFlag } from "./flag.js";
import type { Result } from "@veritas/core";
import type { AppError } from "@veritas/core";

export interface FlagProvider {
  /** Retrieve a single flag by its key */
  getFlag(key: string): Promise<Result<FeatureFlag, AppError>>;

  /** Retrieve all flags, optionally filtered by tags */
  listFlags(tags?: readonly string[]): Promise<Result<readonly FeatureFlag[], AppError>>;

  /** Persist or update a flag */
  setFlag(flag: FeatureFlag): Promise<Result<void, AppError>>;

  /** Remove a flag by key */
  deleteFlag(key: string): Promise<Result<void, AppError>>;

  /** Check if a flag exists */
  hasFlag(key: string): Promise<boolean>;
}
