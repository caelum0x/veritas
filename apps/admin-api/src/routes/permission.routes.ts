// Permission admin routes — list and inspect available permissions
import { Router } from "express";
import { makePermissionController } from "../controllers/permission.controller.js";
import { validate } from "../middleware/pagination.js";
import {
  listPermissionsSchema,
  getPermissionSchema,
  createPermissionSchema,
  updatePermissionSchema,
  deletePermissionSchema,
} from "../validators/permission.validator.js";
import type { PermissionService } from "../controllers/permission.controller.js";

export function makePermissionRouter(permissionService: PermissionService): Router {
  const router = Router();
  const ctrl = makePermissionController(permissionService);

  router.get("/", validate(listPermissionsSchema), ctrl.listPermissions);
  router.get("/:id", validate(getPermissionSchema), ctrl.getPermission);
  router.post("/", validate(createPermissionSchema), ctrl.createPermission);
  router.patch("/:id", validate(updatePermissionSchema), ctrl.updatePermission);
  router.delete("/:id", validate(deletePermissionSchema), ctrl.deletePermission);

  return router;
}
