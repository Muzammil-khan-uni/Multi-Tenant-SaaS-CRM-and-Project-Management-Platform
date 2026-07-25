import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { PERMISSIONS, ROLES } from "../config/permissions.js";
import membershipSchema from "./Membership.js";

const userSchema = new mongoose.Schema(
  {
    // Authentication
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, "Invalid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Minimum 8 characters"],
      select: false,
    },

    // Profile
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      maxlength: 50,
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
      maxlength: 50,
    },
    avatar: {
      url: String,
      publicId: String,
      thumbnail: String,
    },
    phone: String,
    position: String,
    department: String,

    bio: {
      type: String,
      maxlength: [500, "About me cannot exceed 500 characters"],
      trim: true,
    },
    skills: [
      {
        name: { type: String, trim: true },
        level: {
          type: String,
          enum: ["beginner", "intermediate", "advanced", "expert"],
          default: "intermediate",
        },
      },
    ],
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },

    isSuperAdmin: { type: Boolean, default: false, index: true },

    // ── Multi-Workspace Memberships ──────────────────────────────────────────
    // A user can belong to multiple workspaces, each with its own role/permissions.
    workspaceMemberships: [membershipSchema],

    isActive: { type: Boolean, default: true, index: true },
    isEmailVerified: { type: Boolean, default: false },
    lastLogin: Date,
    lastLoginIp: String,

    loginAttempts: { type: Number, default: 0 },
    lockUntil: Date,
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    passwordHistory: [{ password: String, changedAt: Date }],

    refreshToken: String,
    refreshTokenExpires: Date,
    activeSessions: [
      {
        token: String,
        ip: String,
        userAgent: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],

    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: String,

    preferences: {
      theme: {
        type: String,
        enum: ["light", "dark", "system"],
        default: "system",
      },
      language: { type: String, default: "en" },
      notifications: {
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
        desktop: { type: Boolean, default: true },
      },
      timezone: { type: String, default: "UTC" },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

userSchema.index({ "workspaceMemberships.workspace": 1 });
userSchema.index({
  "workspaceMemberships.workspace": 1,
  "workspaceMemberships.isActive": 1,
});
userSchema.index({
  "workspaceMemberships.workspace": 1,
  "workspaceMemberships.role": 1,
});
userSchema.index({ "activeSessions.token": 1 });
userSchema.index({ firstName: "text", lastName: "text", email: "text" });

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  if (this.passwordHistory && this.passwordHistory.length > 0) {
    for (const historyEntry of this.passwordHistory.slice(-5)) {
      const isMatch = await bcrypt.compare(
        this.password,
        historyEntry.password,
      );
      if (isMatch) throw new Error("Cannot reuse any of your last 5 passwords");
    }
  }

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);

  if (!this.passwordHistory) this.passwordHistory = [];
  this.passwordHistory.push({ password: this.password, changedAt: new Date() });
  if (this.passwordHistory.length > 5) {
    this.passwordHistory = this.passwordHistory.slice(-5);
  }

  this.passwordChangedAt = Date.now() - 1000;
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.generateAuthToken = function () {
  return jwt.sign({ id: this._id, email: this.email }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "15m",
  });
};

userSchema.methods.generateRefreshToken = function () {
  const token = jwt.sign({ id: this._id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  });
  this.refreshToken = crypto.createHash("sha256").update(token).digest("hex");
  this.refreshTokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  return token;
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10,
    );
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

userSchema.methods.generateEmailVerificationToken = function () {
  const token = crypto.randomBytes(32).toString("hex");
  this.emailVerificationToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
  this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000;
  return token;
};

userSchema.methods.generatePasswordResetToken = function () {
  const token = crypto.randomBytes(32).toString("hex");
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
  this.passwordResetExpires = Date.now() + 60 * 60 * 1000;
  return token;
};

userSchema.methods.incrementLoginAttempts = async function () {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    this.loginAttempts = 1;
    this.lockUntil = undefined;
  } else {
    this.loginAttempts += 1;
    if (this.loginAttempts >= 5) {
      this.lockUntil = Date.now() + 30 * 60 * 1000;
    }
  }
  await this.save({ validateBeforeSave: false });
  return this.loginAttempts;
};

userSchema.methods.isAccountLocked = function () {
  return this.lockUntil && this.lockUntil > Date.now();
};

userSchema.methods.getRemainingLockTime = function () {
  if (!this.lockUntil || this.lockUntil < Date.now()) return 0;
  return Math.ceil((this.lockUntil - Date.now()) / 1000 / 60);
};

userSchema.methods.addSession = function (token, ip, userAgent) {
  if (this.activeSessions.length >= 5) {
    this.activeSessions = this.activeSessions.slice(-4);
  }
  this.activeSessions.push({
    token: crypto.createHash("sha256").update(token).digest("hex"),
    ip,
    userAgent,
    createdAt: new Date(),
  });
};

userSchema.methods.removeSession = function (token) {
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  this.activeSessions = this.activeSessions.filter(
    (s) => s.token !== hashedToken,
  );
};

userSchema.methods.getMembership = function (workspaceId) {
  return (
    this.workspaceMemberships?.find(
      (m) => m.workspace.toString() === workspaceId.toString() && m.isActive,
    ) || null
  );
};

userSchema.methods.addOrUpdateMembership = function ({
  workspace,
  role,
  permissions,
  invitedBy,
}) {
  const existing = this.workspaceMemberships?.find(
    (m) => m.workspace.toString() === workspace.toString(),
  );
  if (existing) {
    existing.role = role;
    existing.permissions = permissions;
    existing.isActive = true;
    if (invitedBy) existing.invitedBy = invitedBy;
  } else {
    this.workspaceMemberships.push({
      workspace,
      role,
      permissions: permissions || [],
      isActive: true,
      joinedAt: new Date(),
      invitedBy: invitedBy || undefined,
    });
  }
};

userSchema.methods.deactivateMembership = function (workspaceId) {
  const membership = this.workspaceMemberships?.find(
    (m) => m.workspace.toString() === workspaceId.toString(),
  );
  if (membership) membership.isActive = false;
};

userSchema.methods.removeMembership = function (workspaceId) {
  this.workspaceMemberships = this.workspaceMemberships.filter(
    (m) => m.workspace.toString() !== workspaceId.toString(),
  );
};

userSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

userSchema.virtual("assignedTasks", {
  ref: "Task",
  localField: "_id",
  foreignField: "assignedTo.user",
});

userSchema.statics.findByEmail = function (email) {
  return this.findOne({ email: email.toLowerCase() });
};

userSchema.statics.findActiveByWorkspace = function (workspaceId) {
  return this.find({
    workspaceMemberships: {
      $elemMatch: { workspace: workspaceId, isActive: true },
    },
    isActive: true,
  });
};

userSchema.statics.formatMember = function (user, workspaceId) {
  const obj = user.toObject ? user.toObject() : user;
  const membership = workspaceId
    ? user.workspaceMemberships?.find(
        (m) => m.workspace.toString() === workspaceId.toString() && m.isActive,
      )
    : null;

  obj.role = membership?.role || null;
  obj.permissions = membership?.permissions || [];

  delete obj.password;
  delete obj.refreshToken;
  delete obj.passwordHistory;
  delete obj.activeSessions;
  delete obj.twoFactorSecret;
  delete obj.passwordResetToken;
  delete obj.emailVerificationToken;

  return obj;
};

export default mongoose.model("User", userSchema);
