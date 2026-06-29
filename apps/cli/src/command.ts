// Command interface and base types for CLI command implementations
import type { Logger } from "@veritas/core";

export interface CommandContext {
  readonly args: readonly string[];
  readonly flags: Readonly<Record<string, string | boolean | undefined>>;
  readonly logger: Logger;
  readonly outputJson: boolean;
}

export interface Command {
  readonly name: string;
  readonly aliases?: readonly string[];
  readonly description: string;
  readonly usage: string;
  readonly examples?: readonly string[];
  run(ctx: CommandContext): Promise<void>;
}

export interface CommandResult {
  readonly exitCode: number;
  readonly message?: string;
}
