import { Router } from "express";
import {
  getPendingApprovalsController,
  getApprovalHistoryController,
  approveLeaveController,
  rejectLeaveController,
} from "#controllers/admin/leave.controller";

const router = Router();

router.get("/pending",  getPendingApprovalsController);
router.get("/history",  getApprovalHistoryController);
router.post("/:leaveId/approve",  approveLeaveController);
router.post("/:leaveId/reject",  rejectLeaveController);

export default router;