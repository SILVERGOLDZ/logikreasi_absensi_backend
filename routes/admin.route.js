// routes/admin/admin.route.js
import express from "express";
import { Router } from "express";
import { createAnnouncementAdminController } from "#controllers/admin/announcement.controller";
import leaveAdminRoute from "./admin/leave.route.js";
import { registerUserController } from "#controllers/admin/user.controller";
import overtimeAdminRoute from "#routes/admin/overtime.route";

const router = Router();

// router.post("/add-user", registerUserController);
router.post("/user/register", registerUserController);
router.post("/announcement", createAnnouncementAdminController);
router.use("/leave", leaveAdminRoute);
router.use("/overtime", overtimeAdminRoute);

export default router;