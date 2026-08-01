// routes/attendance.route.js
import express from "express";
import { 
  statusController, 
  clockInController, 
  clockOutController, 
  getWorkingController,
  getPresentController,
  getAbsentController,
  getCalendarController,
  // holidayClockInController
} from "#controllers/attendance.controller";

import { createUploader } from '#middleware/upload';

const router = express.Router();

const uploadSelfie = createUploader({
  subPath: 'selfies',
  prefix: 'selfie',
  useUserId: true, // supaya path tetap public/uploads/selfies/<userId>/ seperti versi lama
});

router.get("/status", statusController);        

router.post("/clock-in", uploadSelfie.single('selfie'), clockInController);
router.post("/clock-out", uploadSelfie.single('selfie'), clockOutController);

router.get("/working-now", getWorkingController);
router.get('/present', getPresentController);
router.get('/absent', getAbsentController);
router.get('/calendar', getCalendarController);

export default router;