import mongoose from "mongoose";

const employeeSchema = new mongoose.Schema(
  {
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    employeeId: {
      type: String,
    },
    department: {
      name: String,
      code: String,
      manager: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    },
    position: {
      title: String,
      level: {
        type: String,
        enum: [
          "junior",
          "mid",
          "senior",
          "lead",
          "manager",
          "director",
          "vp",
          "c-level",
        ],
        default: "junior",
      },
      startDate: Date,
    },
    employmentType: {
      type: String,
      enum: ["full_time", "part_time", "contract", "intern", "consultant"],
      default: "full_time",
    },
    status: {
      type: String,
      enum: ["active", "inactive", "on_leave", "terminated"],
      default: "active",
    },
    attendance: {
      status: {
        type: String,
        enum: ["present", "absent", "late", "half_day", "remote"],
        default: "present",
      },
      lastCheckIn: Date,
      lastCheckOut: Date,
      totalHoursToday: {
        type: Number,
        default: 0,
      },
    },
    personalInfo: {
      dateOfBirth: Date,
      gender: String,
      nationality: String,
      address: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: String,
      },
      phone: String,
    },

    currentLeave: {
      leaveType: {
        type: String,
        enum: ["annual", "sick", "personal", "unpaid"],
      },
      startDate: Date,
      endDate: Date,
      totalDays: Number,
      reason: String,
      approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      approvedAt: Date,
    },

    leaveHistory: [
      {
        leaveType: String,
        startDate: Date,
        endDate: Date,
        totalDays: Number,
        reason: String,
        approvedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        approvedAt: Date,
        returnedAt: Date,
      },
    ],

    workInfo: {
      hireDate: Date,
      probationEndDate: Date,
      terminationDate: Date,
      terminationReason: String,
      salary: {
        amount: Number,
        currency: { type: String, default: "USD" },
        type: {
          type: String,
          enum: ["hourly", "monthly", "annual"],
          default: "annual",
        },
      },
    },
    skills: [
      {
        name: String,
        level: {
          type: String,
          enum: ["beginner", "intermediate", "advanced", "expert"],
        },
        yearsOfExperience: Number,
      },
    ],

    leaveBalance: {
      annual: { type: Number, default: 20 },
      sick: { type: Number, default: 10 },
      personal: { type: Number, default: 5 },
      used: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
  },
);

employeeSchema.index({ workspace: 1, status: 1 });
employeeSchema.index({ "department.name": 1 });
employeeSchema.index(
  { workspace: 1, employeeId: 1 },
  { unique: true, sparse: true },
);

employeeSchema.pre("save", async function () {
  // Auto-generate employee ID for new employees
  if (this.isNew && !this.employeeId) {
    const count = await mongoose.model("Employee").countDocuments({
      workspace: this.workspace,
    });
    this.employeeId = `EMP-${String(count + 1).padStart(5, "0")}`;
  }
});

employeeSchema.methods.getFullName = async function () {
  const User = mongoose.model("User");
  const user = await User.findById(this.user).select("firstName lastName");
  return user ? `${user.firstName} ${user.lastName}` : "Unknown";
};

export default mongoose.model("Employee", employeeSchema);
