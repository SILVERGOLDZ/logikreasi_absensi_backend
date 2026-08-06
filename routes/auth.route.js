import { Router } from "express";
import { loginController, meController } from "#controllers/auth.controller";
import { authenticate } from "#middleware/authenticate";

const router = Router();

router.post("/login", loginController);
router.get("/me", authenticate, meController);

export default router;