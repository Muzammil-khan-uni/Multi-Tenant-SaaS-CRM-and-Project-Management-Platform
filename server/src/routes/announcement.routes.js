import express from "express";
import {
  getActiveAnnouncements,
  markAnnouncementRead,
} from "../controllers/superAdminController.js";

const router = express.Router();

router.get("/active", getActiveAnnouncements);
router.post("/:id/read", markAnnouncementRead);

export default router;
