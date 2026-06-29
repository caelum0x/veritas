// Tasks controller: validates HTTP requests and delegates to the tasks service.

import { type Request, type Response } from "express";
import { isErr } from "@veritas/core";
import { makeA2AError } from "@veritas/a2a-protocol";
import { isGatewayError } from "../../errors.js";
import {
  CreateTaskBodySchema,
  TaskParamsSchema,
  ListTasksQuerySchema,
  CancelTaskBodySchema,
} from "./tasks.schema.js";
import type { TasksService } from "./tasks.service.js";

/** All controller methods share this dependency shape. */
export interface TasksControllerDeps {
  readonly tasksService: TasksService;
}

/** POST /tasks — submit a new verification task. */
export async function createTask(
  req: Request,
  res: Response,
  deps: TasksControllerDeps
): Promise<void> {
  const bodyResult = CreateTaskBodySchema.safeParse(req.body);
  if (!bodyResult.success) {
    const details = bodyResult.error.issues.map((i) => i.message).join("; ");
    res
      .status(400)
      .json(makeA2AError("BAD_REQUEST", `Invalid task request: ${details}`));
    return;
  }

  const body = bodyResult.data;
  const result = await deps.tasksService.submitTask({
    taskId: body.taskId,
    threadId: body.threadId,
    correlationId: body.correlationId,
    priority: body.priority,
    message: body.message as Record<string, unknown>,
  });

  if (isErr(result)) {
    const httpStatus = isGatewayError(result.error) ? result.error.status : 500;
    const code = isGatewayError(result.error) ? result.error.code : "INTERNAL_ERROR";
    const message = result.error instanceof Error ? result.error.message : "Task processing failed";
    res.status(httpStatus).json(makeA2AError(code, message, body.correlationId));
    return;
  }

  res.status(200).json(result.value);
}

/** GET /tasks — list tasks with optional filtering. */
export function listTasks(
  req: Request,
  res: Response,
  deps: TasksControllerDeps
): void {
  const queryResult = ListTasksQuerySchema.safeParse(req.query);
  if (!queryResult.success) {
    const details = queryResult.error.issues.map((i) => i.message).join("; ");
    res.status(400).json({ error: "BAD_REQUEST", message: `Invalid query: ${details}` });
    return;
  }

  const result = deps.tasksService.listTasks({
    status: queryResult.data.status,
    limit: queryResult.data.limit,
    cursor: queryResult.data.cursor,
  });

  if (isErr(result)) {
    const message = result.error instanceof Error ? result.error.message : "Internal error";
    res.status(500).json({ error: "INTERNAL_ERROR", message });
    return;
  }

  res.status(200).json({ data: result.value.items, nextCursor: result.value.nextCursor ?? null });
}

/** GET /tasks/:taskId — retrieve a single task by id. */
export function getTaskById(
  req: Request,
  res: Response,
  deps: TasksControllerDeps
): void {
  const paramsResult = TaskParamsSchema.safeParse(req.params);
  if (!paramsResult.success) {
    res.status(400).json({ error: "BAD_REQUEST", message: "Invalid taskId" });
    return;
  }

  const result = deps.tasksService.getTask(paramsResult.data.taskId);
  if (isErr(result)) {
    const httpStatus = isGatewayError(result.error) ? result.error.status : 500;
    const code = isGatewayError(result.error) ? result.error.code : "INTERNAL_ERROR";
    const message = result.error instanceof Error ? result.error.message : "Internal error";
    res.status(httpStatus).json({ error: code, message });
    return;
  }

  res.status(200).json({ data: result.value });
}

/** POST /tasks/:taskId/cancel — cancel a task in a non-terminal state. */
export function cancelTaskById(
  req: Request,
  res: Response,
  deps: TasksControllerDeps
): void {
  const paramsResult = TaskParamsSchema.safeParse(req.params);
  if (!paramsResult.success) {
    res.status(400).json({ error: "BAD_REQUEST", message: "Invalid taskId" });
    return;
  }

  const cancelBody = CancelTaskBodySchema.safeParse(req.body);
  const cancelReason = cancelBody.success ? cancelBody.data.reason : undefined;

  const result = deps.tasksService.cancelTask(paramsResult.data.taskId, cancelReason);
  if (isErr(result)) {
    const httpStatus = isGatewayError(result.error) ? result.error.status : 500;
    const code = isGatewayError(result.error) ? result.error.code : "INTERNAL_ERROR";
    const message = result.error instanceof Error ? result.error.message : "Internal error";
    res.status(httpStatus).json({ error: code, message });
    return;
  }

  res.status(200).json({ data: result.value });
}
