// Verifies the container wires the REAL AnthropicProvider when an API key is
// configured, and only falls back to the mock provider when it is absent.
import { test } from "node:test";
import assert from "node:assert/strict";
import { noopLogger } from "@veritas/core";
import { Container } from "../src/container.js";
import { CONFIG, LOGGER, LLM_PROVIDER } from "../src/tokens.js";
import { registerVerificationModule } from "../src/modules/verification.module.js";

const anthropicSection = {
  apiKey: "sk-ant-test-key",
  baseUrl: "https://api.anthropic.com",
  model: "claude-sonnet-4-5",
  fastModel: "claude-haiku-4-5",
  maxTokens: 4096,
  temperature: 0.2,
  concurrency: 5,
  timeoutMs: 120_000,
  maxRetries: 3,
  promptCaching: true,
};

test("LLM_PROVIDER is the real AnthropicProvider when an API key is configured", () => {
  const c = new Container();
  c.value(LOGGER, noopLogger);
  c.value(CONFIG, { anthropic: anthropicSection } as never);
  registerVerificationModule(c);

  const provider = c.resolve(LLM_PROVIDER);
  assert.equal(provider.name, "anthropic");
});

test("LLM_PROVIDER falls back to mock only when no API key is configured", () => {
  const c = new Container();
  c.value(LOGGER, noopLogger);
  // No CONFIG bound → no API key available.
  registerVerificationModule(c);

  const provider = c.resolve(LLM_PROVIDER);
  assert.equal(provider.name, "mock");
});
