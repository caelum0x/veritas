// Login routes — mounts credential-based login endpoint at POST /login.

import { Router } from "express";
import type { LoginController } from "../controllers/login.controller.js";

export function createLoginRouter(controller: LoginController): Router {
  const router = Router();

  // POST /auth/login — exchange credentials for a session token
  router.post("/login", (req, res, next) => {
    controller.handle(req, res, next);
  });

  return router;
}
