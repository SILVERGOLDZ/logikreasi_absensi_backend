// routes/admin/overtime.route.js
//
// !! DRAFT - sama seperti routes/overtime.route.js, sesuaikan middleware-nya !!

import { Router } from "express";
import {
  getPendingOvertimeApprovalsController,
  getOvertimeApprovalHistoryController,
  approveOvertimeController,
  rejectOvertimeController,
} from "#controllers/admin/overtime.controller";

const router = Router();

router.get("/pending", getPendingOvertimeApprovalsController);
router.get("/history", getOvertimeApprovalHistoryController);
router.patch("/:overtimeId/approve", approveOvertimeController);
router.patch("/:overtimeId/reject", rejectOvertimeController);

export default router;