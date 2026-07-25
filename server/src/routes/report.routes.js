import express from "express";
import {
  getEmployeePerformance,
  getProjectProgress,
  getTaskCompletion,
  getRevenueSummary,
  exportReport,
} from "../controllers/reportController.js";
import { getDashboardStats } from "../controllers/dashboardController.js";
import { authenticate } from "../middleware/auth.js";
import { requirePermission } from "../middleware/rbac.js";

const router = express.Router();
router.use(authenticate);

router.get("/dashboard", getDashboardStats);
router.get(
  "/employee-performance",
  requirePermission("view_reports"),
  getEmployeePerformance,
);
router.get(
  "/project-progress",
  requirePermission("view_reports"),
  getProjectProgress,
);
router.get(
  "/task-completion",
  requirePermission("view_reports"),
  getTaskCompletion,
);
router.get("/revenue", requirePermission("view_reports"), getRevenueSummary);
router.post("/export", requirePermission("export_reports"), exportReport);

export default router;
