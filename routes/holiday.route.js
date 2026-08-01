import express from "express";
import {
  createHolidayController,
  cancelHolidayController,
  listHolidaysController,
} from "#controllers/holiday.controller";

const router = express.Router();

router.get("/", listHolidaysController);
router.post("/", createHolidayController);
router.patch("/:id/cancel", cancelHolidayController);

export default router;