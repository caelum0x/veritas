// A2A service: routes inbound task requests through the verification engine and CAP bridge.

import { ok, err, isErr, isOk, newId, epochToIso, type Result } from "@veritas/core";
import {
  A2AMessageSchema,
  a2aMessageToCapNegotiation,
  capDeliveryToA2AResult,
  makeEnvelope,
  type A2AResponseEnvelope,
  type CapBridgeConfig,
  A2ANegotiationError,
  A2AValidationError,
} from "@veritas/a2a-protocol";
import { runVerification } from "@veritas/verification";
import type { Logger } from "@veritas/observability";
import type { EngineOptions } from "@veritas/verification";
import { taskResultToEnvelope, type TaskResponseDto } from "./a2a.mapper.js";
import type { SubmitTaskBody, CapDeliveryBody } from "./a2a.schema.js";

/** Minimal runtime dependencies required by the A2A service. */
export interface A2AServiceDeps {
  readonly logger: Logger;
  readonly engineOptions: EngineOptions;
  readonly capBridgeConfig: CapBridgeConfig;
}

/** Result of a bridged CAP negotiation attempt. */
export interface CapNegotiationResult {
  readonly accepted: boolean;
  readonly orderId?: string;
  readonly reason?: string;
}

/** Core A2A service wired to @veritas/verification and @veritas/a2a-protocol. */
export class A2AService {
  private readonly logger: Logger;
  private readonly engineOptions: EngineOptions;
  private readonly capBridgeConfig: CapBridgeConfig;

  constructor(deps: A2AServiceDeps) {
    this.logger = deps.logger;
    this.engineOptions = deps.engineOptions;
    this.capBridgeConfig = deps.capBridgeConfig;
  }

  /**
   * Submit an A2A task: validate the message, extract text, run verification,
   * and return the result as an A2A response envelope.
   */
  async submitTask(
    body: SubmitTaskBody,
    correlationId?: string
  ): Promise<Result<A2AResponseEnvelope>> {
    const startMs = Date.now();
    const taskId = body.taskId ?? newId("task");
    const threadId = body.threadId ?? newId("thread");
    const now = epochToIso(Date.now());

    // Build and validate the full A2A message
    const rawMessage = {
      id: body.message.id ?? newId("msg"),
      taskId,
      threadId,
      role: body.message.role ?? "user",
      parts: body.message.parts,
      createdAt: now,
      metadata: body.message.metadata,
    };

    const parsed = A2AMessageSchema.safeParse(rawMessage);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => i.message).join("; ");
      return err(new A2AValidationError(`Invalid A2A message: ${issues}`));
    }

    const a2aMessage = parsed.data;

    // Extract text part required by the verification engine
    const textPart = a2aMessage.parts.find((p) => p.kind === "text");
    if (!textPart || textPart.kind !== "text") {
      return err(
        new A2AValidationError(
          "A2A message must contain at least one text part for verification"
        )
      );
    }

    this.logger.info("a2a-service: starting verification task", {
      taskId,
      threadId,
      priority: body.priority,
    });

    const verificationResult = await runVerification(
      { text: textPart.text, metadata: { a2aTaskId: taskId, a2aThreadId: threadId } },
      this.engineOptions
    );

    const durationMs = Date.now() - startMs;

    if (isErr(verificationResult)) {
      const error = verificationResult.error;
      this.logger.error("a2a-service: verification failed", {
        taskId,
        code: error.code,
        message: error.message,
        durationMs,
      });

      const dto: TaskResponseDto = {
        taskId,
        threadId,
        status: "failed",
        errorCode: String(error.code),
        errorMessage: error.message,
        durationMs,
        correlationId,
      };
      return ok(taskResultToEnvelope(dto));
    }

    const { report, totalTokensUsed } = verificationResult.value;
    this.logger.info("a2a-service: task completed", {
      taskId,
      durationMs,
      totalTokensUsed,
    });

    const dto: TaskResponseDto = {
      taskId,
      threadId,
      status: "completed",
      report,
      durationMs,
      correlationId,
    };
    return ok(taskResultToEnvelope(dto));
  }

  /**
   * Bridge an A2A task message to a CAP negotiation request.
   * Returns the negotiation outcome from the CAP provider.
   */
  async bridgeToCapNegotiation(
    body: SubmitTaskBody
  ): Promise<Result<CapNegotiationResult>> {
    const taskId = body.taskId ?? newId("task");
    const threadId = body.threadId ?? newId("thread");
    const now = epochToIso(Date.now());

    const rawMessage = {
      id: body.message.id ?? newId("msg"),
      taskId,
      threadId,
      role: body.message.role ?? "user",
      parts: body.message.parts,
      createdAt: now,
      metadata: body.message.metadata,
    };

    const parsed = A2AMessageSchema.safeParse(rawMessage);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => i.message).join("; ");
      return err(new A2AValidationError(`Invalid A2A message: ${issues}`));
    }

    const capRequest = a2aMessageToCapNegotiation(
      parsed.data,
      this.capBridgeConfig
    );
    if (!isOk(capRequest)) {
      return err(capRequest.error);
    }

    // POST the negotiation to the CAP provider endpoint
    const capEndpoint = `${this.capBridgeConfig.capEndpoint}/negotiations`;
    let responseBody: unknown;
    try {
      const envelope = makeEnvelope(capRequest.value, taskId);
      const response = await fetch(capEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/a2a+json" },
        body: envelope.body,
      });
      responseBody = await response.json();
    } catch (cause) {
      return err(
        new A2ANegotiationError(
          `CAP endpoint unreachable: ${capEndpoint}`,
          { cause }
        )
      );
    }

    const parsed2 = (await import("@veritas/a2a-protocol")).CapNegotiationResponseSchema.safeParse(
      responseBody
    );
    if (!parsed2.success) {
      return err(
        new A2ANegotiationError(
          `Invalid CAP negotiation response: ${parsed2.error.message}`
        )
      );
    }

    return ok({
      accepted: parsed2.data.accepted,
      orderId: parsed2.data.orderId,
      reason: parsed2.data.reason,
    });
  }

  /** Handle an inbound CAP delivery and convert it to a structured result. */
  handleCapDelivery(
    body: CapDeliveryBody
  ): Result<ReturnType<typeof capDeliveryToA2AResult> extends Result<infer T> ? T : never> {
    const result = capDeliveryToA2AResult(body);
    return result as Result<
      ReturnType<typeof capDeliveryToA2AResult> extends Result<infer T> ? T : never
    >;
  }
}

/** Factory function — instantiates A2AService from deps. */
export function createA2AService(deps: A2AServiceDeps): A2AService {
  return new A2AService(deps);
}
