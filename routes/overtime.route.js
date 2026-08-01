import { Router } from "express";
import {
  getOvertimeApproversController,
  createOvertimeController,
  getMyOvertimesController,
} from "#controllers/overtime.controller";
import { overtimeUpload } from "#middleware/overtimeUpload";

const router = Router();

router.get("/approvers", getOvertimeApproversController);
router.get("/my", getMyOvertimesController);
router.post("/", overtimeUpload.array("attachments"), createOvertimeController);
 
export default router;