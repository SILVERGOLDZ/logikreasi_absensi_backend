// routes/admin/admin.route.js
import express from "express";
import { Router } from "express";
import { createAnnouncementAdminController } from "#controllers/admin/announcement.controller";
import leaveAdminRoute from "#routes/admin/leave.route";
import attendanceAdminRoute from "#routes/admin/attendance.route";
import { getUserRolesController, registerUserController } from "#controllers/admin/user.controller";
import overtimeAdminRoute from "#routes/admin/overtime.route";

const router = Router();

router.get("/user/roles", getUserRolesController);
router.post("/user/register", registerUserController);
router.post("/announcement", createAnnouncementAdminController);
router.use("/leave", leaveAdminRoute);
router.use("/overtime", overtimeAdminRoute);
router.use("/attendance", attendanceAdminRoute);

export default router;