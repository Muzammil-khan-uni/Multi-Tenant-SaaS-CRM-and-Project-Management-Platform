import express from "express";
import {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  addTeamMember,
  removeTeamMember,
  addMilestone,
  updateMilestoneStatus,
  getProjectStats,
} from "../controllers/projectController.js";
import { authenticate } from "../middleware/auth.js";
import { requirePermission } from "../middleware/rbac.js";

const router = express.Router();
router.use(authenticate);

router
  .route("/")
  .get(requirePermission("view_projects"), getProjects)
  .post(requirePermission("create_projects"), createProject);

router.get("/stats", getProjectStats);

router
  .route("/:id")
  .get(requirePermission("view_projects"), getProjectById)
  .put(requirePermission("update_projects"), updateProject)
  .delete(requirePermission("delete_projects"), deleteProject);

router.post(
  "/:id/team",
  requirePermission("assign_project_team"),
  addTeamMember,
);
router.delete(
  "/:id/team/:userId",
  requirePermission("assign_project_team"),
  removeTeamMember,
);

router.post(
  "/:id/milestones",
  requirePermission("update_projects"),
  addMilestone,
);
router.put(
  "/:id/milestones/:milestoneId",
  requirePermission("update_projects"),
  updateMilestoneStatus,
);

export default router;
