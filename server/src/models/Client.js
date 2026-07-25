import mongoose from "mongoose";

const clientSchema = new mongoose.Schema(
  {
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },

    company: {
      name: { type: String, required: true, trim: true },
      legalName: String,
      website: String,
      industry: { type: String, index: true },
      size: String,
      taxId: String,
      logo: { url: String, publicId: String },
    },

    contacts: [
      {
        firstName: { type: String, required: true },
        lastName: { type: String, required: true },
        email: { type: String, lowercase: true, trim: true },
        phone: String,
        mobile: String,
        position: String,
        department: String,
        isPrimary: { type: Boolean, default: false },
        isDecisionMaker: { type: Boolean, default: false },
        notes: String,
        socialProfiles: {
          linkedin: String,
          twitter: String,
          facebook: String,
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
    billingAddress: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },

    status: {
      type: String,
      enum: ["active", "inactive", "lead", "prospect", "churned", "on_hold"],
      default: "active",
      index: true,
    },
    source: {
      type: String,
      enum: [
        "referral",
        "website",
        "social_media",
        "email",
        "cold_call",
        "event",
        "partner",
        "other",
      ],
    },
    type: {
      type: String,
      enum: [
        "individual",
        "small_business",
        "enterprise",
        "government",
        "non_profit",
      ],
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    accountManager: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    tags: [String],
    labels: [
      {
        name: String,
        color: String,
      },
    ],

    notes: [
      {
        content: { type: String, required: true },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        createdAt: { type: Date, default: Date.now },
        isPrivate: { type: Boolean, default: false },
      },
    ],

    activityTimeline: [
      {
        type: {
          type: String,
          enum: [
            "note",
            "email",
            "call",
            "meeting",
            "project_created",
            "invoice_sent",
            "payment_received",
            "status_change",
            "other",
          ],
        },
        title: String,
        description: String,
        performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        timestamp: { type: Date, default: Date.now },
        metadata: mongoose.Schema.Types.Mixed,
      },
    ],

    totalRevenue: { type: Number, default: 0 },
    totalProjects: { type: Number, default: 0 },
    paymentTerms: String,
    creditLimit: Number,
    creditCurrency: {
      type: String,
      default: "USD",
    },

    projects: [{ type: mongoose.Schema.Types.ObjectId, ref: "Project" }],
    invoices: [{ type: mongoose.Schema.Types.ObjectId, ref: "Invoice" }],

    documents: [
      {
        name: String,
        type: String,
        url: String,
        publicId: String,
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    communicationPreferences: {
      email: { type: Boolean, default: true },
      phone: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
    },

    customFields: { type: Map, of: mongoose.Schema.Types.Mixed },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

clientSchema.index({ workspace: 1, status: 1 });
clientSchema.index({ workspace: 1, assignedTo: 1 });
clientSchema.index({ "contacts.email": 1 });
clientSchema.index({
  "company.name": "text",
  "contacts.firstName": "text",
  "contacts.lastName": "text",
});
clientSchema.index({ tags: 1 });

clientSchema.methods.addActivity = function (
  type,
  title,
  description,
  userId,
  metadata = {},
) {
  this.activityTimeline.push({
    type,
    title,
    description,
    performedBy: userId,
    metadata,
  });
};

clientSchema.methods.getPrimaryContact = function () {
  return this.contacts.find((c) => c.isPrimary) || this.contacts[0];
};

export default mongoose.model("Client", clientSchema);
