import express from "express";
import authRoutes from "./auth.routes.js";
import userRoutes from "./user.routes.js";
import workspaceRoutes from "./workspace.routes.js";
import clientRoutes from "./client.routes.js";
import projectRoutes from "./project.routes.js";
import taskRoutes from "./task.routes.js";
import invoiceRoutes from "./invoice.routes.js";
import reportRoutes from "./report.routes.js";
import uploadRoutes from "./upload.routes.js";
import { authenticate } from "../middleware/auth.js";
import permissionRoutes from "./permission.routes.js";
import employeeRoutes from "./employee.routes.js";
import notificationRoutes from "./notification.routes.js";
import {
  resolveWorkspace,
  tenantIsolation,
  validateWorkspaceMembership,
} from "../middleware/tenant.js";
import apiDocsRoutes from "./apiDocs.routes.js";
import chatRoutes from "./chat.routes.js";
import superAdminRoutes from "./superAdmin.routes.js";
import announcementRoutes from "./announcement.routes.js";

const router = express.Router();

router.get("/health", (req, res) => {
  res.json({ success: true, message: "Server is running" });
});

router.use("/docs", apiDocsRoutes);

// Public routes
router.use("/auth", authRoutes);
router.use("/upload", uploadRoutes);

router.use("/workspaces", workspaceRoutes);

router.use("/super-admin", superAdminRoutes);

// Protected routes with tenant isolation
router.use(authenticate);
router.use("/announcements", announcementRoutes);
router.use(resolveWorkspace);
router.use(validateWorkspaceMembership);
router.use(tenantIsolation);

// All routes below are workspace-isolated
router.use("/users", userRoutes);
router.use("/clients", clientRoutes);
router.use("/projects", projectRoutes);
router.use("/tasks", taskRoutes);
router.use("/invoices", invoiceRoutes);
router.use("/reports", reportRoutes);
router.use("/employees", employeeRoutes);
router.use("/permissions", permissionRoutes);
router.use("/notifications", notificationRoutes);
router.use("/chat", chatRoutes);

router.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

export default router;
