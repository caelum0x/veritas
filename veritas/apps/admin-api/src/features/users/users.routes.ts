// Users routes: mounts CRUD, status management, email verification, and login-record endpoints.
import type { Router } from "express";
import type { Deps } from "../../container.js";
import { asyncHandler } from "../../http/async-handler.js";
import { UsersService } from "./users.service.js";
import { UsersController } from "./users.controller.js";

/** Register all user routes on the given Express router. */
export function registerUsersRoutes(router: Router, deps: Deps): void {
  const service = new UsersService({
    userService: deps.userService,
    auditLogService: deps.auditLogService,
  });
  const ctrl = new UsersController(service);

  router.post("/", asyncHandler((req, res, next) => ctrl.create(req, res, next)));
  router.get("/", asyncHandler((req, res, next) => ctrl.list(req, res, next)));
  router.get("/:userId", asyncHandler((req, res, next) => ctrl.getById(req, res, next)));
  router.patch("/:userId", asyncHandler((req, res, next) => ctrl.update(req, res, next)));
  router.post(
    "/:userId/status",
    asyncHandler((req, res, next) => ctrl.setStatus(req, res, next)),
  );
  router.post(
    "/:userId/verify-email",
    asyncHandler((req, res, next) => ctrl.verifyEmail(req, res, next)),
  );
  router.post(
    "/:userId/record-login",
    asyncHandler((req, res, next) => ctrl.recordLogin(req, res, next)),
  );
}
