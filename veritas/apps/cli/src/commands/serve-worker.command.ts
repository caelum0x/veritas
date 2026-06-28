// ServeWorker command — launches the background job worker process
import { spawn } from "node:child_process";
import { printLine, printSuccess, printError } from "../output.js";
import type { Command, CommandContext } from "../command.js";

function resolveWorkerEnv(
  flags: Readonly<Record<string, string | boolean | undefined>>
): NodeJS.ProcessEnv {
  const concurrency =
    typeof flags["concurrency"] === "string" ? flags["concurrency"] : undefined;
  const pollInterval =
    typeof flags["poll-interval"] === "string" ? flags["poll-interval"] : undefined;

  return {
    ...process.env,
    NODE_ENV: process.env["NODE_ENV"] ?? "development",
    ...(concurrency !== undefined ? { WORKER_CONCURRENCY: concurrency } : {}),
    ...(pollInterval !== undefined ? { WORKER_POLL_INTERVAL_MS: pollInterval } : {}),
  };
}

export const serveWorkerCommand: Command = {
  name: "serve:worker",
  aliases: ["worker"],
  description: "Start the Veritas background job worker",
  usage: "veritas serve:worker [--concurrency <n>] [--poll-interval <ms>]",
  examples: [
    "veritas serve:worker",
    "veritas serve:worker --concurrency 10",
    "veritas serve:worker --poll-interval 500 --concurrency 3",
  ],

  async run(ctx: CommandContext): Promise<void> {
    const env = resolveWorkerEnv(ctx.flags);
    const concurrency = env["WORKER_CONCURRENCY"] ?? "5";
    const pollInterval = env["WORKER_POLL_INTERVAL_MS"] ?? "1000";

    printLine(`Starting Veritas worker (concurrency=${concurrency}, poll=${pollInterval}ms)...`);
    ctx.logger.info("serve:worker: spawning", { concurrency, pollInterval });

    await new Promise<void>((resolve, reject) => {
      const child = spawn(
        process.execPath,
        ["--import", "tsx/esm", "src/main.ts"],
        {
          cwd: new URL("../../../../apps/worker", import.meta.url).pathname,
          stdio: "inherit",
          env,
        }
      );

      printSuccess(`Worker process started (pid ${child.pid ?? "unknown"})`);

      process.on("SIGTERM", () => child.kill("SIGTERM"));
      process.on("SIGINT", () => child.kill("SIGINT"));

      child.on("error", (err: Error) => {
        printError(`Worker process error: ${err.message}`);
        reject(err);
      });

      child.on("close", (code: number | null) => {
        ctx.logger.info("serve:worker: process exited", { code });
        if (code === 0 || code === null) {
          resolve();
        } else {
          reject(new Error(`Worker exited with code ${code}`));
        }
      });
    });
  },
};
