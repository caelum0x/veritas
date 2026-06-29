// Route definitions for the authenticated user self-service /me resource
import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { getMe, updateMe, deleteMe } from "../controllers/me.controller.js";
import { UpdateMeSchema } from "../validators/me.validator.js";

const router = Router();

router.use(authMiddleware);

router.get("/", getMe);
router.patch("/", validateBody(UpdateMeSchema), updateMe);
router.delete("/", deleteMe);

export { router as meRouter };
