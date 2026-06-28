// Command registry — maps command names and aliases to Command implementations
import type { Command } from "./command.js";

export class CommandRegistry {
  private readonly commands = new Map<string, Command>();

  register(command: Command): void {
    this.commands.set(command.name, command);
    for (const alias of command.aliases ?? []) {
      this.commands.set(alias, command);
    }
  }

  resolve(name: string): Command | undefined {
    return this.commands.get(name);
  }

  all(): readonly Command[] {
    const seen = new Set<Command>();
    const result: Command[] = [];
    for (const cmd of this.commands.values()) {
      if (!seen.has(cmd)) {
        seen.add(cmd);
        result.push(cmd);
      }
    }
    return result;
  }

  has(name: string): boolean {
    return this.commands.has(name);
  }
}
