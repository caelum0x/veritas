// ServeApi command — launches the REST API server in-process via child_process
import { spawn } from "node:child_process";
import { printLine, printSuccess, printError } from "../output.js";
import type { Command, CommandContext } from "../command.js";

function resolvePort(flags: Readonly<Record<string, string | boolean | undefined>>): string {
  const flagPort = typeof flags["port"] === "string" ? flags["port"] : undefined;
  return flagPort ?? process.env["PORT"] ?? "3000";
}

function resolveNodeEnv(flags: Readonly<Record<string, string | boolean | undefined>>): string {
  const flagEnv = typeof flags["env"] === "string" ? flags["env"] : undefined;
  return flagEnv ?? process.env["NODE_ENV"] ?? "development";
}

export const serveApiCommand: Command = {
  name: "serve:api",
  aliases: ["api"],
  description: "Start the Veritas REST API server",
  usage: "veritas serve:api [--port <number>] [--env <development|production>]",
  examples: [
    "veritas serve:api",
    "veritas serve:api --port 4000",
    "veritas serve:api --env production --port 3000",
  ],

  async run(ctx: CommandContext): Promise<void> {
    const port = resolvePort(ctx.flags);
    const nodeEnv = resolveNodeEnv(ctx.flags);

    printLine(`Starting Veritas API server on port ${port} (${nodeEnv})...`);
    ctx.logger.info("serve:api: spawning", { port, nodeEnv });

    const env: NodeJS.ProcessEnv = {
      ...process.env,
      PORT: port,
      NODE_ENV: nodeEnv,
    };

    await new Promise<void>((resolve, reject) => {
      const child = spawn(
        process.execPath,
        ["--import", "tsx/esm", "src/main.ts"],
        {
          cwd: new URL("../../../../apps/api", import.meta.url).pathname,
          stdio: "inherit",
          env,
        }
      );

      printSuccess(`API server process started (pid ${child.pid ?? "unknown"})`);

      process.on("SIGTERM", () => child.kill("SIGTERM"));
      process.on("SIGINT", () => child.kill("SIGINT"));

      child.on("error", (err: Error) => {
        printError(`API server process error: ${err.message}`);
        reject(err);
      });

      child.on("close", (code: number | null) => {
        ctx.logger.info("serve:api: process exited", { code });
        if (code === 0 || code === null) {
          resolve();
        } else {
          reject(new Error(`API server exited with code ${code}`));
        }
      });
    });
  },
};
