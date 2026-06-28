// CLI argument parser and command dispatcher
import { noopLogger } from "@veritas/core";
import type { Command, CommandContext } from "./command.js";
import { CommandRegistry } from "./registry.js";
import { printError, printLine } from "./output.js";

export interface ParsedArgs {
  readonly command: string | undefined;
  readonly positional: readonly string[];
  readonly flags: Readonly<Record<string, string | boolean | undefined>>;
  readonly outputJson: boolean;
  readonly help: boolean;
  readonly version: boolean;
}

export function parseArgs(argv: readonly string[]): ParsedArgs {
  const positional: string[] = [];
  const flags: Record<string, string | boolean | undefined> = {};
  let command: string | undefined;
  let outputJson = false;
  let help = false;
  let version = false;

  const args = argv.slice(2); // strip node + script
  let i = 0;

  while (i < args.length) {
    const arg = args[i];
    if (arg === undefined) { i++; continue; }

    if (arg === "--json") {
      outputJson = true;
    } else if (arg === "--help" || arg === "-h") {
      help = true;
    } else if (arg === "--version" || arg === "-v") {
      version = true;
    } else if (arg.startsWith("--")) {
      const eq = arg.indexOf("=");
      if (eq !== -1) {
        const key = arg.slice(2, eq);
        const val = arg.slice(eq + 1);
        flags[key] = val;
      } else if (i + 1 < args.length && !args[i + 1]!.startsWith("-")) {
        flags[arg.slice(2)] = args[++i];
      } else {
        flags[arg.slice(2)] = true;
      }
    } else if (arg.startsWith("-") && arg.length === 2) {
      const key = arg.slice(1);
      if (i + 1 < args.length && !args[i + 1]!.startsWith("-")) {
        flags[key] = args[++i];
      } else {
        flags[key] = true;
      }
    } else if (command === undefined) {
      command = arg;
    } else {
      positional.push(arg);
    }

    i++;
  }

  return { command, positional, flags, outputJson, help, version };
}

export async function dispatch(
  registry: CommandRegistry,
  parsed: ParsedArgs,
  helpText: string,
  version: string,
): Promise<number> {
  if (parsed.version) {
    printLine(version);
    return 0;
  }

  if (parsed.help && parsed.command === undefined) {
    printLine(helpText);
    return 0;
  }

  if (parsed.command === undefined) {
    printLine(helpText);
    return 0;
  }

  const cmd: Command | undefined = registry.resolve(parsed.command);

  if (cmd === undefined) {
    printError(`Unknown command: ${parsed.command}`);
    printLine("Run 'veritas --help' for usage.");
    return 1;
  }

  if (parsed.help) {
    printLine(`Usage: veritas ${cmd.usage}`);
    printLine("");
    printLine(cmd.description);
    if (cmd.examples && cmd.examples.length > 0) {
      printLine("");
      printLine("Examples:");
      for (const ex of cmd.examples) {
        printLine(`  ${ex}`);
      }
    }
    return 0;
  }

  const ctx: CommandContext = {
    args: parsed.positional,
    flags: parsed.flags,
    logger: noopLogger,
    outputJson: parsed.outputJson,
  };

  try {
    await cmd.run(ctx);
    return 0;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    printError(message);
    return 1;
  }
}
