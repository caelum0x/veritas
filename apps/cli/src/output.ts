// CLI output helpers: table rendering and JSON formatting
import type { JsonValue } from "@veritas/core";

export type Row = Readonly<Record<string, string | number | boolean | null | undefined>>;

export function printJson(value: JsonValue): void {
  process.stdout.write(JSON.stringify(value, null, 2) + "\n");
}

export function printTable(rows: readonly Row[]): void {
  if (rows.length === 0) {
    process.stdout.write("(no results)\n");
    return;
  }

  const keys = Object.keys(rows[0] as Record<string, unknown>);
  const widths: Record<string, number> = {};

  for (const key of keys) {
    widths[key] = key.length;
  }

  for (const row of rows) {
    for (const key of keys) {
      const val = String(row[key] ?? "");
      if (val.length > (widths[key] ?? 0)) {
        widths[key] = val.length;
      }
    }
  }

  const separator = keys.map((k) => "-".repeat(widths[k] ?? k.length)).join("  ");
  const header = keys.map((k) => k.toUpperCase().padEnd(widths[k] ?? k.length)).join("  ");

  process.stdout.write(header + "\n");
  process.stdout.write(separator + "\n");

  for (const row of rows) {
    const line = keys.map((k) => String(row[k] ?? "").padEnd(widths[k] ?? k.length)).join("  ");
    process.stdout.write(line + "\n");
  }
}

export function printLine(message: string): void {
  process.stdout.write(message + "\n");
}

export function printError(message: string): void {
  process.stderr.write("Error: " + message + "\n");
}

export function printSuccess(message: string): void {
  process.stdout.write("✓ " + message + "\n");
}

export function printWarning(message: string): void {
  process.stderr.write("Warning: " + message + "\n");
}
