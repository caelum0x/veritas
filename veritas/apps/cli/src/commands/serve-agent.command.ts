// ServeAgent command — launches the CAP agent process
import { spawn } from "node:child_process";
import { printLine, printSuccess, printError } from "../output.js";
import type { Command, CommandContext } from "../command.js";

function resolveAgentEnv(
  flags: Readonly<Record<string, string | boolean | undefined>>
): NodeJS.ProcessEnv {
  const agentId =
    typeof flags["agent-id"] === "string" ? flags["agent-id"] : undefined;
  const chainId =
    typeof flags["chain-id"] === "string" ? flags["chain-id"] : undefined;
  const simulate = flags["simulate"] === true || flags["simulate"] === "true";

  return {
    ...process.env,
    NODE_ENV: process.env["NODE_ENV"] ?? "development",
    ...(agentId !== undefined ? { CAP_AGENT_ID: agentId } : {}),
    ...(chainId !== undefined ? { CAP_CHAIN_ID: chainId } : {}),
    ...(simulate ? { CAP_SIMULATE: "true" } : {}),
  };
}

export const serveAgentCommand: Command = {
  name: "serve:agent",
  aliases: ["agent"],
  description: "Start the Veritas CAP agent (Claim Adjudication Provider)",
  usage: "veritas serve:agent [--agent-id <id>] [--chain-id <id>] [--simulate]",
  examples: [
    "veritas serve:agent",
    "veritas serve:agent --agent-id agent-prod-01",
    "veritas serve:agent --simulate --chain-id testnet",
  ],

  async run(ctx: CommandContext): Promise<void> {
    const env = resolveAgentEnv(ctx.flags);
    const agentId = env["CAP_AGENT_ID"] ?? "(from config)";
    const simulate = env["CAP_SIMULATE"] === "true";

    printLine(`Starting Veritas CAP agent (agentId=${agentId}, simulate=${simulate})...`);
    ctx.logger.info("serve:agent: spawning", { agentId, simulate });

    await new Promise<void>((resolve, reject) => {
      const child = spawn(
        process.execPath,
        ["--import", "tsx/esm", "src/main.ts"],
        {
          cwd: new URL("../../../../apps/cap-agent", import.meta.url).pathname,
          stdio: "inherit",
          env,
        }
      );

      printSuccess(`CAP agent process started (pid ${child.pid ?? "unknown"})`);

      process.on("SIGTERM", () => child.kill("SIGTERM"));
      process.on("SIGINT", () => child.kill("SIGINT"));

      child.on("error", (err: Error) => {
        printError(`CAP agent process error: ${err.message}`);
        reject(err);
      });

      child.on("close", (code: number | null) => {
        ctx.logger.info("serve:agent: process exited", { code });
        if (code === 0 || code === null) {
          resolve();
        } else {
          reject(new Error(`CAP agent exited with code ${code}`));
        }
      });
    });
  },
};
