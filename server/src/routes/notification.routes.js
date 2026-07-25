import express from "express";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  archiveNotification,
  createNotification,
  getUnreadCount,
  sendRealTimeNotification,
  getNotificationSettings,
  updateNotificationSettings,
} from "../controllers/notificationController.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

router.use(authenticate);

router.post("/send", sendRealTimeNotification);
router.get("/", getNotifications);
router.get("/unread-count", getUnreadCount);
router.post("/", createNotification);
router.put("/read-all", markAllAsRead);
router.put("/:id/read", markAsRead);
router.put("/:id/archive", archiveNotification);
router.get("/settings", getNotificationSettings);
router.put("/settings", updateNotificationSettings);

export default router;
