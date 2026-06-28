// Help text generation for the CLI and individual commands
import type { Command } from "./command.js";

const BINARY = "veritas";

export function globalHelp(commands: readonly Command[]): string {
  const lines: string[] = [
    `${BINARY} — enterprise fact-verification & source-provenance platform`,
    "",
    "USAGE",
    `  ${BINARY} <command> [flags]`,
    "",
    "COMMANDS",
    ...commands.map((c) => formatCommandLine(c)),
    "",
    "FLAGS",
    "  --api-key <key>    API key (overrides VERITAS_API_KEY)",
    "  --api-url <url>    API base URL (overrides VERITAS_API_URL)",
    "  --json             Output raw JSON",
    "  --no-color         Disable color output",
    "  --help, -h         Show help",
    "  --version, -v      Show version",
    "",
    "ENVIRONMENT",
    "  VERITAS_API_KEY    API key for authentication",
    "  VERITAS_API_URL    API base URL",
    "  VERITAS_OUTPUT_FORMAT  Output format: table | json",
    "  VERITAS_LOG_LEVEL  Log level: debug | info | warn | error",
    "  NO_COLOR           Disable color output when set",
    "",
    `Run '${BINARY} <command> --help' for command-specific help.`,
  ];
  return lines.join("\n");
}

export function commandHelp(cmd: Command): string {
  const lines: string[] = [
    cmd.description,
    "",
    "USAGE",
    `  ${BINARY} ${cmd.usage}`,
  ];

  if (cmd.aliases && cmd.aliases.length > 0) {
    lines.push("", "ALIASES", `  ${cmd.aliases.join(", ")}`);
  }

  if (cmd.examples && cmd.examples.length > 0) {
    lines.push("", "EXAMPLES", ...cmd.examples.map((e) => `  ${e}`));
  }

  lines.push("", "FLAGS", "  --json       Output raw JSON", "  --help, -h   Show this help");

  return lines.join("\n");
}

function formatCommandLine(cmd: Command): string {
  const name = cmd.aliases && cmd.aliases.length > 0
    ? `${cmd.name}, ${cmd.aliases.join(", ")}`
    : cmd.name;
  const padded = name.padEnd(24);
  return `  ${padded}${cmd.description}`;
}

export function versionText(version: string): string {
  return `${BINARY}/${version}`;
}
