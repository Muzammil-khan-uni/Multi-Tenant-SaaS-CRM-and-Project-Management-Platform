import express from "express";
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  updateProfile,
} from "../controllers/userController.js";
import { authenticate } from "../middleware/auth.js";
import { requirePermission } from "../middleware/rbac.js";

const router = express.Router();

router.use(authenticate);

router
  .route("/")
  .get(requirePermission("view_users"), getUsers)
  .post(requirePermission("create_users"), createUser);

router
  .route("/:id")
  .get(getUserById)
  .put(requirePermission("update_users"), updateUser)
  .delete(requirePermission("delete_users"), deleteUser);

router.put("/profile/update", updateProfile);

export default router;
