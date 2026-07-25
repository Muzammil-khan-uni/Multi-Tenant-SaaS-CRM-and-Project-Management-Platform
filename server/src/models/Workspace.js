import mongoose from "mongoose";
import crypto from "crypto";

const workspaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Workspace name is required"],
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      maxlength: 500,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    domain: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
    },
    company: {
      legalName: String,
      taxId: String,
      website: String,
      phone: String,
      email: String,
      address: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: String,
      },
      logo: { url: String, publicId: String },
    },
    branding: {
      primaryColor: { type: String, default: "#3b82f6" },
      secondaryColor: { type: String, default: "#8b5cf6" },
      logo: { url: String, publicId: String },
      favicon: String,
      customDomain: String,
    },
    industry: {
      type: String,
      enum: [
        "technology",
        "healthcare",
        "finance",
        "education",
        "retail",
        "manufacturing",
        "consulting",
        "marketing",
        "real_estate",
        "legal",
        "other",
      ],
      index: true,
    },
    size: {
      type: String,
      enum: ["1-10", "11-50", "51-200", "201-500", "500+"],
    },
    settings: {
      timezone: { type: String, default: "UTC" },
      dateFormat: { type: String, default: "MM/DD/YYYY" },
      currency: { type: String, default: "USD" },
      language: { type: String, default: "en" },
      weekStartsOn: {
        type: String,
        enum: ["monday", "sunday"],
        default: "monday",
      },
      workingHours: {
        start: { type: String, default: "09:00" },
        end: { type: String, default: "17:00" },
      },
      features: {
        clientPortal: { type: Boolean, default: false },
        timeTracking: { type: Boolean, default: true },
        invoicing: { type: Boolean, default: true },
        reports: { type: Boolean, default: true },
        api: { type: Boolean, default: false },
      },
    },
    plan: {
      type: String,
      enum: ["free", "starter", "professional", "enterprise"],
      default: "free",
      index: true,
    },
    subscription: {
      status: {
        type: String,
        enum: ["active", "inactive", "trial", "cancelled", "past_due"],
        default: "trial",
        index: true,
      },
      trialEndsAt: Date,
      currentPeriodStart: Date,
      currentPeriodEnd: Date,
      stripeCustomerId: String,
      stripeSubscriptionId: String,
      planLimits: {
        maxUsers: { type: Number, default: 5 },
        maxClients: { type: Number, default: 50 },
        maxProjects: { type: Number, default: 10 },
        maxStorage: { type: Number, default: 1 },
        features: [String],
      },
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    admins: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    invitations: [
      {
        email: { type: String, lowercase: true },
        role: {
          type: String,
          enum: [
            "company_admin",
            "project_manager",
            "team_lead",
            "employee",
            "client",
          ],
        },
        token: String,
        invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        status: {
          type: String,
          enum: ["pending", "accepted", "expired", "cancelled"],
          default: "pending",
        },
        expiresAt: Date,
        createdAt: { type: Date, default: Date.now },
      },
    ],

    isActive: { type: Boolean, default: true, index: true },
    isVerified: { type: Boolean, default: false },
    deletedAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

workspaceSchema.index({ "invitations.email": 1, "invitations.status": 1 });
workspaceSchema.index({
  "subscription.status": 1,
  "subscription.trialEndsAt": 1,
});
workspaceSchema.index({ isActive: 1, isVerified: 1 });

workspaceSchema.virtual("activeProjectCount", {
  ref: "Project",
  localField: "_id",
  foreignField: "workspace",
  count: true,
  match: { status: "active", isArchived: false },
});

workspaceSchema.pre("save", async function () {
  if (this.isModified("name") && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-");
  }
  if (this.isNew && !this.slug) {
    const suffix = crypto.randomBytes(3).toString("hex");
    this.slug = `${this.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")}-${suffix}`;
  }
});

workspaceSchema.methods.canAddUser = async function () {
  return true;
};

workspaceSchema.methods.canAddProject = async function () {
  return true;
};

workspaceSchema.methods.canAddClient = async function () {
  return true;
};

workspaceSchema.methods.generateInvitationToken = function () {
  return crypto.randomBytes(32).toString("hex");
};

export default mongoose.model("Workspace", workspaceSchema);
