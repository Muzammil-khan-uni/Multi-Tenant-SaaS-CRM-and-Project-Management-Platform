import mongoose from "mongoose";

const invoiceSchema = new mongoose.Schema(
  {
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },

    number: {
      type: String,
      index: true,
    },
    reference: String,
    poNumber: String,

    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
      index: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
    },

    status: {
      type: String,
      enum: ["draft", "sent", "paid", "overdue", "cancelled", "refunded"],
      default: "draft",
      index: true,
    },
    type: {
      type: String,
      enum: ["one_time", "recurring", "retainer", "credit_note"],
      default: "one_time",
    },

    issueDate: { type: Date, default: Date.now },
    dueDate: { type: Date, required: true, index: true },
    sentDate: Date,
    paidDate: Date,
    cancelledDate: Date,

    currency: { type: String, default: "USD" },
    items: [
      {
        description: { type: String, required: true },
        quantity: { type: Number, default: 1, min: 1 },
        unitPrice: { type: Number, required: true, min: 0 },
        amount: Number,
        tax: { rate: Number, amount: Number },
        task: { type: mongoose.Schema.Types.ObjectId, ref: "Task" },
      },
    ],

    subtotal: { type: Number, default: 0 },
    taxTotal: { type: Number, default: 0 },
    discount: { type: Number, default: 0, min: 0 },
    discountType: {
      type: String,
      enum: ["fixed", "percentage"],
      default: "fixed",
    },
    total: { type: Number, default: 0 },
    amountPaid: { type: Number, default: 0 },
    balanceDue: { type: Number, default: 0 },

    paymentTerms: { type: String, default: "net30" },
    paymentMethod: {
      type: String,
      enum: [
        "credit_card",
        "bank_transfer",
        "paypal",
        "check",
        "cash",
        "other",
      ],
    },
    payments: [
      {
        amount: Number,
        method: String,
        transactionId: String,
        date: { type: Date, default: Date.now },
        notes: String,
        recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      },
    ],

    recurring: {
      isRecurring: { type: Boolean, default: false },
      frequency: {
        type: String,
        enum: ["weekly", "monthly", "quarterly", "annually"],
      },
      nextDate: Date,
      endDate: Date,
      parentInvoice: { type: mongoose.Schema.Types.ObjectId, ref: "Invoice" },
    },

    notes: String,
    termsAndConditions: String,
    footer: String,

    template: String,
    sendReminders: { type: Boolean, default: true },
    reminderDays: { type: Number, default: 3 },

    activityLog: [
      {
        action: String,
        description: String,
        performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        timestamp: { type: Date, default: Date.now },
      },
    ],

    attachments: [
      {
        name: String,
        url: String,
        publicId: String,
        type: String,
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  },
);

invoiceSchema.index({ workspace: 1, status: 1, dueDate: 1 });
invoiceSchema.index({ workspace: 1, client: 1, status: 1 });
invoiceSchema.index({ "recurring.nextDate": 1 });
invoiceSchema.index(
  { workspace: 1, number: 1 },
  { unique: true, sparse: true },
);

invoiceSchema.virtual("isOverdue").get(function () {
  return (
    this.dueDate < new Date() && !["paid", "cancelled"].includes(this.status)
  );
});

invoiceSchema.virtual("paymentStatus").get(function () {
  if (this.amountPaid >= this.total) return "paid";
  if (this.amountPaid > 0) return "partial";
  return "unpaid";
});

invoiceSchema.pre("save", async function () {
  if (this.isNew) {
    const count = await mongoose
      .model("Invoice")
      .countDocuments({ workspace: this.workspace });
    this.number = `INV-${String(count + 1).padStart(5, "0")}`;
  }

  // Auto-mark as overdue if past due date and not paid/cancelled
  if (
    ["sent"].includes(this.status) &&
    this.dueDate &&
    new Date(this.dueDate) < new Date()
  ) {
    this.status = "overdue";
  }

  this.subtotal = this.items.reduce((sum, item) => {
    item.amount = item.quantity * item.unitPrice;
    if (item.tax) item.tax.amount = item.amount * ((item.tax.rate || 0) / 100);
    return sum + item.amount;
  }, 0);

  this.taxTotal = this.items.reduce(
    (sum, item) => sum + (item.tax?.amount || 0),
    0,
  );

  if (this.discountType === "percentage") {
    this.total =
      this.subtotal + this.taxTotal - (this.subtotal * this.discount) / 100;
  } else {
    this.total = this.subtotal + this.taxTotal - (this.discount || 0);
  }

  if (this.total < 0) this.total = 0;
  if (this.amountPaid > this.total) this.amountPaid = this.total;
  this.balanceDue = this.total - this.amountPaid;
  if (this.balanceDue < 0) this.balanceDue = 0;

  if (this.balanceDue <= 0 && this.status !== "cancelled") {
    this.status = "paid";
    if (!this.paidDate) this.paidDate = new Date();
  }
});

invoiceSchema.methods.recordPayment = function (
  amount,
  method,
  transactionId,
  notes,
  userId,
) {
  this.payments.push({
    amount,
    method,
    transactionId,
    notes,
    recordedBy: userId,
  });
  this.amountPaid += amount;
  return this.save();
};

invoiceSchema.methods.addActivity = function (action, description, userId) {
  this.activityLog.push({ action, description, performedBy: userId });
};

export default mongoose.model("Invoice", invoiceSchema);
