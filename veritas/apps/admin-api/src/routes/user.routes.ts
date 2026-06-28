// User admin routes — CRUD + role assignment endpoints
import { Router } from "express";
import type { UserService } from "../controllers/user.controller.js";
import { makeUserController } from "../controllers/user.controller.js";

export function createUserRouter(userService: UserService): Router {
  const router = Router();
  const ctrl = makeUserController(userService);

  router.get("/", ctrl.listUsers);
  router.get("/:id", ctrl.getUser);
  router.patch("/:id", ctrl.updateUser);
  router.delete("/:id", ctrl.deleteUser);
  router.post("/:id/roles", ctrl.assignRole);
  router.delete("/:id/roles", ctrl.revokeRole);

  return router;
}
