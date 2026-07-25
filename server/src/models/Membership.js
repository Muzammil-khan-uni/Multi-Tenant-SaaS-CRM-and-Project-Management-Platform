import mongoose from "mongoose";
import { PERMISSIONS, ROLES } from "../config/permissions.js";

const membershipSchema = new mongoose.Schema(
  {
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.EMPLOYEE,
    },
    permissions: [{ type: String, enum: Object.values(PERMISSIONS) }],
    isActive: { type: Boolean, default: true },
    joinedAt: { type: Date, default: Date.now },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { _id: true },
);

export default membershipSchema;
