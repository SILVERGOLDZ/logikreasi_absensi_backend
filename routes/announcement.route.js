import express from "express";
import {
  getUnreadCountController,
  getAnnouncementsController,
  getAnnouncementDetailController,
  markAllAsReadController,
} from "#controllers/announcement.controller";

const router = express.Router();

router.get("/unread-count", getUnreadCountController);
router.post("/mark-all-read", markAllAsReadController);
router.get("/:id", getAnnouncementDetailController);
router.get("/", getAnnouncementsController);

export default router;