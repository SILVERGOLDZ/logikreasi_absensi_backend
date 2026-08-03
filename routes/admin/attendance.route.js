import { Router } from "express";
import {
  manualClockInController,
  manualClockOutController,
  getAttendanceStatusController,
} from "#controllers/admin/attendance.controller";

const router = Router();

router.get("/status", getAttendanceStatusController);
router.post("/clock-in", manualClockInController);
router.post("/clock-out", manualClockOutController);

export default router;