// Tasks routes: mounts all task endpoints on the supplied router.

import { Router } from "express";
import type { Logger } from "@veritas/observability";
import type { EngineOptions } from "@veritas/verification";
import { createTasksService } from "./tasks.service.js";
import {
  createTask,
  listTasks,
  getTaskById,
  cancelTaskById,
} from "./tasks.controller.js";

/** Deps shape expected from the app container by this feature module. */
export interface TasksRouteDeps {
  readonly logger: Logger;
  readonly engineOptions: EngineOptions;
}

/**
 * Register all tasks routes on the provided router.
 *
 * Mounted endpoints:
 *   POST   /tasks              — submit a new verification task
 *   GET    /tasks              — list tasks (filterable, cursor-paginated)
 *   GET    /tasks/:taskId      — get a single task by id
 *   POST   /tasks/:taskId/cancel — cancel a pending/in-progress task
 */
export function registerTasksRoutes(router: Router, deps: TasksRouteDeps): void {
  const tasksService = createTasksService({
    logger: deps.logger,
    engineOptions: deps.engineOptions,
  });

  const ctrl = { tasksService };

  router.post("/tasks", async (req, res) => {
    await createTask(req, res, ctrl);
  });

  router.get("/tasks", (req, res) => {
    listTasks(req, res, ctrl);
  });

  router.get("/tasks/:taskId", (req, res) => {
    getTaskById(req, res, ctrl);
  });

  router.post("/tasks/:taskId/cancel", (req, res) => {
    cancelTaskById(req, res, ctrl);
  });
}
