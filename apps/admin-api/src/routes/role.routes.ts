// Role admin routes — CRUD + permission assignment
import { Router } from "express";
import { makeRoleController } from "../controllers/role.controller.js";
import { validate } from "../middleware/pagination.js";
import {
  listRolesSchema,
  getRoleSchema,
  createRoleSchema,
  updateRoleSchema,
  deleteRoleSchema,
  assignPermissionsSchema,
  revokePermissionsSchema,
} from "../validators/role.validator.js";
import type { RoleService } from "../controllers/role.controller.js";

export function makeRoleRouter(roleService: RoleService): Router {
  const router = Router();
  const ctrl = makeRoleController(roleService);

  router.get("/", validate(listRolesSchema), ctrl.listRoles);
  router.get("/:id", validate(getRoleSchema), ctrl.getRole);
  router.post("/", validate(createRoleSchema), ctrl.createRole);
  router.patch("/:id", validate(updateRoleSchema), ctrl.updateRole);
  router.delete("/:id", validate(deleteRoleSchema), ctrl.deleteRole);
  router.post(
    "/:id/permissions",
    validate(assignPermissionsSchema),
    ctrl.assignPermissions
  );
  router.delete(
    "/:id/permissions",
    validate(revokePermissionsSchema),
    ctrl.revokePermissions
  );

  return router;
}
