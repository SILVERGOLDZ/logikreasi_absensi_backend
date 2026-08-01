import { Router } from "express";
import {
  getApproversController,
  createLeaveController,
  getMyLeavesController,
} from "#controllers/leave.controller";
import { leaveUpload } from "#middleware/leaveUpload";

const router = Router();

router.get("/approvers", getApproversController);
router.get("/my", getMyLeavesController);
// field file harus bernama 'attachments' (jamak) di request multipart dari Flutter, maksimal 5 file
router.post("/", leaveUpload.array("attachments", 5), createLeaveController);

export default router;