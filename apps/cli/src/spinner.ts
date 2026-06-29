// Terminal progress spinner with start/stop/succeed/fail helpers
import { loadCliConfig } from "./config.js";

const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"] as const;
const INTERVAL_MS = 80;

export interface Spinner {
  start(text?: string): void;
  stop(): void;
  succeed(text?: string): void;
  fail(text?: string): void;
  update(text: string): void;
}

export function createSpinner(initialText = ""): Spinner {
  const { noColor } = loadCliConfig();
  const isTTY = process.stderr.isTTY === true;
  let frameIndex = 0;
  let text = initialText;
  let timer: ReturnType<typeof setInterval> | undefined;
  let running = false;

  function render(): void {
    if (!isTTY || noColor) return;
    const frame = FRAMES[frameIndex % FRAMES.length];
    process.stderr.write(`\r${frame} ${text}`);
    frameIndex++;
  }

  function clear(): void {
    if (!isTTY || noColor) return;
    process.stderr.write(`\r\x1b[K`);
  }

  return {
    start(newText?: string): void {
      if (running) return;
      if (newText !== undefined) text = newText;
      running = true;
      frameIndex = 0;
      render();
      timer = setInterval(render, INTERVAL_MS);
    },

    stop(): void {
      if (!running) return;
      running = false;
      clearInterval(timer);
      timer = undefined;
      clear();
    },

    succeed(newText?: string): void {
      this.stop();
      const label = newText ?? text;
      const icon = noColor ? "✓" : "\x1b[32m✓\x1b[0m";
      process.stderr.write(`${icon} ${label}\n`);
    },

    fail(newText?: string): void {
      this.stop();
      const label = newText ?? text;
      const icon = noColor ? "✗" : "\x1b[31m✗\x1b[0m";
      process.stderr.write(`${icon} ${label}\n`);
    },

    update(newText: string): void {
      text = newText;
    },
  };
}
