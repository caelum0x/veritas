// CAPAgentClient: HTTP-based client for hiring remote CAP agents to run verifications.

import { ok, err, tryAsync, noopLogger } from "@veritas/core";
import type { Result, AppError, Logger } from "@veritas/core";
import type { VerificationReport } from "@veritas/contracts";
import type { RegistryEntry } from "./registry.js";

/** Request payload sent to a remote CAP agent. */
export interface CAPAgentRequest {
  readonly claimText: string;
  readonly effort: "low" | "standard" | "high";
  readonly maxClaims?: number;
  readonly timeoutMs?: number;
}

/** Response received from a remote CAP agent. */
export interface CAPAgentResponse {
  readonly report: VerificationReport;
  readonly durationMs: number;
  readonly tokensUsed?: number;
}

/** Port interface for an outbound HTTP transport. */
export interface HttpTransport {
  post(url: string, body: unknown, headers: Record<string, string>): Promise<unknown>;
}

/** In-memory no-op transport used when no real HTTP layer is wired in. */
class NoopHttpTransport implements HttpTransport {
  async post(_url: string, _body: unknown, _headers: Record<string, string>): Promise<unknown> {
    return { error: "noop transport — no real HTTP layer wired" };
  }
}

/** Calls a single remote CAP agent over HTTP and returns its VerificationReport. */
export class CAPAgentClient {
  private readonly transport: HttpTransport;
  private readonly logger: Logger;

  constructor(transport: HttpTransport = new NoopHttpTransport(), logger: Logger = noopLogger) {
    this.transport = transport;
    this.logger = logger;
  }

  async hire(
    agent: RegistryEntry,
    request: CAPAgentRequest,
  ): Promise<Result<CAPAgentResponse, AppError>> {
    const startMs = Date.now();

    this.logger.info("cap-agent-client: hiring agent", {
      agentId: agent.agentId,
      endpoint: agent.endpoint,
      effort: request.effort,
    });

    const result = await tryAsync(async () => {
      const raw = await this.transport.post(
        `${agent.endpoint}/verify`,
        {
          text: request.claimText,
          effort: request.effort,
          maxClaims: request.maxClaims,
        },
        {
          "Content-Type": "application/json",
          Authorization: `Bearer ${agent.apiKey}`,
        },
      );

      if (!isCapAgentResponse(raw)) {
        throw new Error(`Unexpected response shape from agent ${agent.agentId}`);
      }

      return {
        report: raw.report,
        durationMs: Date.now() - startMs,
        tokensUsed: raw.tokensUsed,
      } as CAPAgentResponse;
    });

    if (result.ok) {
      this.logger.info("cap-agent-client: hired successfully", {
        agentId: agent.agentId,
        durationMs: result.value.durationMs,
      });
    } else {
      this.logger.error("cap-agent-client: hire failed", {
        agentId: agent.agentId,
        error: String(result.error),
      });
    }

    return result as Result<CAPAgentResponse, AppError>;
  }
}

function isCapAgentResponse(raw: unknown): raw is { report: VerificationReport; tokensUsed?: number } {
  return (
    typeof raw === "object" &&
    raw !== null &&
    "report" in raw &&
    typeof (raw as Record<string, unknown>)["report"] === "object"
  );
}

/** Create a CAPAgentClient with the given transport and logger. */
export function createCAPAgentClient(
  transport?: HttpTransport,
  logger?: Logger,
): CAPAgentClient {
  return new CAPAgentClient(transport, logger);
}

export { NoopHttpTransport };
