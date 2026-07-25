import Invoice from "../models/Invoice.js";
import Client from "../models/Client.js";
import Notification from "../models/Notification.js";
import { sendRealTimeNotification } from "../websocket/socketManager.js";
import { generateInvoicePDF } from "../services/pdfService.js";
import { AppError, asyncHandler } from "../middleware/errorHandler.js";
import { convertToUSD } from "../utils/currency.js";

export const getInvoices = asyncHandler(async (req, res) => {
  const { status, search } = req.query;
  const filter = { workspace: req.workspace._id };

  if (status) filter.status = status;

  if (search && search.trim()) {
    const searchRegex = new RegExp(search.trim(), "i");

    const matchingClients = await Client.find({
      workspace: req.workspace._id,
      "company.name": searchRegex,
    }).select("_id");

    const clientIds = matchingClients.map((c) => c._id);

    filter.$or = [
      { number: searchRegex },
      ...(clientIds.length > 0 ? [{ client: { $in: clientIds } }] : []),
    ];
  }

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const [invoices, totalCount] = await Promise.all([
    Invoice.find(filter)
      .populate("client", "company.name contacts")
      .sort("-createdAt")
      .skip(skip)
      .limit(limit),
    Invoice.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    count: invoices.length,
    pagination: {
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
      totalCount,
    },
    data: invoices,
  });
});

export const getInvoiceById = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOne({
    _id: req.params.id,
    workspace: req.workspace._id,
  })
    .populate("client", "company.name contacts address")
    .populate("project", "name");

  if (!invoice) {
    throw new AppError("Invoice not found", 404);
  }

  if (
    ["sent"].includes(invoice.status) &&
    invoice.dueDate &&
    new Date(invoice.dueDate) < new Date()
  ) {
    invoice.status = "overdue";
    invoice.activityLog.push({
      action: "status_changed",
      description: "Invoice marked as overdue",
      performedBy: null,
      timestamp: new Date(),
    });
    await invoice.save();
  }

  res.status(200).json({
    success: true,
    data: invoice,
  });
});

export const createInvoice = asyncHandler(async (req, res) => {
  req.body.workspace = req.workspace._id;

  const invoice = await Invoice.create(req.body);

  invoice.activityLog.push({
    action: "created",
    description: "Invoice created",
    performedBy: req.user._id,
  });
  await invoice.save();

  if (invoice.client) {
    await Client.findByIdAndUpdate(invoice.client, {
      $push: { invoices: invoice._id },
    });
  }

  const populated = await Invoice.findById(invoice._id).populate(
    "client",
    "company.name contacts",
  );

  if (populated.client?.assignedTo) {
    const assignedUserId =
      populated.client.assignedTo._id || populated.client.assignedTo;
    if (assignedUserId.toString() !== req.user._id.toString()) {
      try {
        const notification = await Notification.create({
          workspace: req.workspace._id,
          recipient: assignedUserId,
          sender: req.user._id,
          type: "invoice_generated",
          title: "New Invoice Generated",
          message: `Invoice ${invoice.number} created for ${populated.client.company?.name}`,
          metadata: { invoiceId: invoice._id, clientId: invoice.client },
        });

        sendRealTimeNotification(assignedUserId.toString(), {
          id: notification._id,
          type: "invoice_generated",
          title: "New Invoice Generated",
          message: `Invoice ${invoice.number} created for ${populated.client.company?.name}`,
          metadata: { invoiceId: invoice._id },
          sender: {
            id: req.user._id,
            firstName: req.user.firstName,
            lastName: req.user.lastName,
          },
          read: false,
        });
      } catch (error) {
        console.error("Invoice notification failed:", error);
      }
    }
  }

  res.status(201).json({
    success: true,
    message: "Invoice created successfully",
    data: populated,
  });
});

export const updateInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOne({
    _id: req.params.id,
    workspace: req.workspace._id,
  });

  if (!invoice) {
    throw new AppError("Invoice not found", 404);
  }

  if (req.body.status) invoice.status = req.body.status;
  if (req.body.currency) invoice.currency = req.body.currency;
  if (req.body.dueDate) invoice.dueDate = req.body.dueDate;
  if (req.body.paymentTerms !== undefined)
    invoice.paymentTerms = req.body.paymentTerms;
  if (req.body.notes !== undefined) invoice.notes = req.body.notes;
  if (req.body.termsAndConditions !== undefined)
    invoice.termsAndConditions = req.body.termsAndConditions;
  if (req.body.discount !== undefined) invoice.discount = req.body.discount;
  if (req.body.discountType) invoice.discountType = req.body.discountType;

  if (req.body.items && Array.isArray(req.body.items)) {
    invoice.items = req.body.items.map((item) => ({
      description: item.description,
      quantity: Number(item.quantity) || 1,
      unitPrice: Number(item.unitPrice) || 0,
    }));
  }

  invoice.activityLog.push({
    action: "updated",
    description: "Invoice updated",
    performedBy: req.user._id,
  });

  await invoice.save();

  const updated = await Invoice.findById(invoice._id).populate(
    "client",
    "company.name contacts",
  );

  res.status(200).json({
    success: true,
    message: "Invoice updated",
    data: updated,
  });
});

export const permanentlyDeleteInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOne({
    _id: req.params.id,
    workspace: req.workspace._id,
  });

  if (!invoice) {
    throw new AppError("Invoice not found", 404);
  }

  if (invoice.client) {
    await Client.findByIdAndUpdate(invoice.client, {
      $pull: { invoices: invoice._id },
    });
  }

  await Invoice.findByIdAndDelete(invoice._id);

  res.status(200).json({
    success: true,
    message: "Invoice permanently deleted",
  });
});

export const cancelInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOne({
    _id: req.params.id,
    workspace: req.workspace._id,
  });

  if (!invoice) {
    throw new AppError("Invoice not found", 404);
  }

  invoice.status = "cancelled";
  invoice.cancelledDate = new Date();

  invoice.activityLog.push({
    action: "cancelled",
    description: "Invoice cancelled",
    performedBy: req.user._id,
  });

  await invoice.save();

  res.status(200).json({
    success: true,
    message: "Invoice cancelled successfully",
    data: invoice,
  });
});

export const sendInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOne({
    _id: req.params.id,
    workspace: req.workspace._id,
  });

  if (!invoice) {
    throw new AppError("Invoice not found", 404);
  }

  invoice.status = "sent";
  invoice.sentDate = new Date();

  invoice.activityLog.push({
    action: "sent",
    description: "Invoice sent to client",
    performedBy: req.user._id,
  });

  await invoice.save();

  const updated = await Invoice.findById(invoice._id).populate(
    "client",
    "company.name contacts",
  );

  const populated = await Invoice.findById(invoice._id).populate(
    "client",
    "company.name contacts assignedTo",
  );

  if (populated.client?.assignedTo) {
    const assignedUserId =
      populated.client.assignedTo._id || populated.client.assignedTo;
    try {
      const notification = await Notification.create({
        workspace: req.workspace._id,
        recipient: assignedUserId,
        sender: req.user._id,
        type: "invoice_generated",
        title: "Invoice Sent",
        message: `Invoice ${invoice.number} has been sent to ${populated.client.company?.name}`,
        metadata: { invoiceId: invoice._id },
      });

      sendRealTimeNotification(assignedUserId.toString(), {
        id: notification._id,
        type: "invoice_generated",
        title: "Invoice Sent",
        message: `Invoice ${invoice.number} has been sent to ${populated.client.company?.name}`,
        metadata: { invoiceId: invoice._id },
        sender: {
          id: req.user._id,
          firstName: req.user.firstName,
          lastName: req.user.lastName,
        },
        read: false,
      });
    } catch (error) {
      console.error("Invoice send notification failed:", error);
    }
  }

  res.status(200).json({
    success: true,
    message: "Invoice sent to client successfully",
    data: updated,
  });
});

export const getClientInvoices = asyncHandler(async (req, res) => {
  const invoices = await Invoice.find({
    workspace: req.workspace._id,
    client: req.params.clientId,
  })
    .sort("-createdAt")
    .populate("client", "company.name");

  res.status(200).json({
    success: true,
    count: invoices.length,
    data: invoices,
  });
});

export const recordPayment = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOne({
    _id: req.params.id,
    workspace: req.workspace._id,
  });

  if (!invoice) {
    throw new AppError("Invoice not found", 404);
  }

  if (invoice.status === "paid") {
    throw new AppError("Invoice is already fully paid", 400);
  }
  if (invoice.status === "cancelled") {
    throw new AppError("Cannot record payment for cancelled invoice", 400);
  }

  const payment = {
    amount: Number(req.body.amount),
    method: req.body.method || "bank_transfer",
    transactionId: req.body.transactionId || "",
    notes: req.body.notes || "",
    date: new Date(),
    recordedBy: req.user._id,
  };

  invoice.payments.push(payment);

  invoice.amountPaid = (invoice.amountPaid || 0) + payment.amount;

  if (invoice.amountPaid >= invoice.total) {
    invoice.status = "paid";
    invoice.balanceDue = 0;
    invoice.paidDate = new Date();
  } else {
    invoice.balanceDue = invoice.total - invoice.amountPaid;

    if (
      invoice.dueDate &&
      new Date(invoice.dueDate) < new Date() &&
      invoice.status !== "paid"
    ) {
      invoice.status = "overdue";
    }
  }

  if (!invoice.activityLog) {
    invoice.activityLog = [];
  }
  invoice.activityLog.push({
    action: "payment_recorded",
    description: `Payment of ${invoice.currency} ${payment.amount.toLocaleString()} recorded via ${payment.method.replace("_", " ")}`,
    performedBy: req.user._id,
    timestamp: new Date(),
  });

  await invoice.save();

  const updatedInvoice = await Invoice.findById(invoice._id)
    .populate("client", "company.name contacts")
    .populate("payments.recordedBy", "firstName lastName");

  const populated = await Invoice.findById(invoice._id).populate(
    "client",
    "company.name contacts assignedTo",
  );

  if (populated.client?.assignedTo) {
    const assignedUserId =
      populated.client.assignedTo._id || populated.client.assignedTo;
    if (assignedUserId.toString() !== req.user._id.toString()) {
      try {
        const notification = await Notification.create({
          workspace: req.workspace._id,
          recipient: assignedUserId,
          sender: req.user._id,
          type: "payment_received",
          title: wasFullyPaid ? "Invoice Fully Paid" : "Payment Received",
          message: wasFullyPaid
            ? `Invoice ${invoice.number} has been fully paid (${invoice.currency} ${req.body.amount})`
            : `Payment of ${invoice.currency} ${req.body.amount} received for invoice ${invoice.number}`,
          metadata: { invoiceId: invoice._id, paymentAmount: req.body.amount },
        });

        sendRealTimeNotification(assignedUserId.toString(), {
          id: notification._id,
          type: "payment_received",
          title: wasFullyPaid ? "Invoice Fully Paid" : "Payment Received",
          message: wasFullyPaid
            ? `Invoice ${invoice.number} has been fully paid (${invoice.currency} ${req.body.amount})`
            : `Payment of ${invoice.currency} ${req.body.amount} received for invoice ${invoice.number}`,
          metadata: { invoiceId: invoice._id },
          sender: {
            id: req.user._id,
            firstName: req.user.firstName,
            lastName: req.user.lastName,
          },
          read: false,
        });
      } catch (error) {
        console.error("Payment notification failed:", error);
      }
    }
  }

  if (req.body.amount >= 1000) {
    try {
      const admins = await User.find({
        workspace: req.workspace._id,
        role: { $in: ["company_admin", "admin", "owner"] },
        isActive: true,
      }).select("_id");

      for (const admin of admins) {
        if (
          admin._id.toString() !== req.user._id.toString() &&
          admin._id.toString() !== assignedUserId?.toString()
        ) {
          const notification = await Notification.create({
            workspace: req.workspace._id,
            recipient: admin._id,
            sender: req.user._id,
            type: "payment_received",
            title: "Large Payment Received",
            message: `Payment of ${invoice.currency} ${req.body.amount} received for invoice ${invoice.number} from ${populated.client?.company?.name || "Client"}`,
            metadata: {
              invoiceId: invoice._id,
              paymentAmount: req.body.amount,
            },
          });

          sendRealTimeNotification(admin._id.toString(), {
            id: notification._id,
            type: "payment_received",
            title: "Large Payment Received",
            message: `Payment of ${invoice.currency} ${req.body.amount} received for invoice ${invoice.number}`,
            metadata: { invoiceId: invoice._id },
            sender: {
              id: req.user._id,
              firstName: req.user.firstName,
              lastName: req.user.lastName,
            },
            read: false,
          });
        }
      }
    } catch (error) {
      console.error("Admin payment notification failed:", error);
    }
  }

  if (
    invoice.dueDate &&
    new Date(invoice.dueDate) < new Date() &&
    invoice.balanceDue > 0
  ) {
    invoice.status = "overdue";
    await invoice.save();
  }

  res.status(200).json({
    success: true,
    message: "Payment recorded successfully",
    data: updatedInvoice,
  });
});

export const getInvoiceStats = asyncHandler(async (req, res) => {
  const workspaceFilter = { workspace: req.workspace._id };

  const [
    totalInvoices,
    paidInvoices,
    sentInvoices,
    draftInvoices,
    overdueInvoices,
    cancelledInvoices,
    allInvoices,
  ] = await Promise.all([
    Invoice.countDocuments(workspaceFilter),
    Invoice.countDocuments({ ...workspaceFilter, status: "paid" }),
    Invoice.countDocuments({ ...workspaceFilter, status: "sent" }),
    Invoice.countDocuments({ ...workspaceFilter, status: "draft" }),
    Invoice.countDocuments({ ...workspaceFilter, status: "overdue" }),
    Invoice.countDocuments({ ...workspaceFilter, status: "cancelled" }),
    Invoice.find(workspaceFilter).select(
      "total amountPaid balanceDue currency status dueDate",
    ),
  ]);

  let totalRevenueUSD = 0;
  let totalOutstandingUSD = 0;
  let totalPaidUSD = 0;
  const currencyTotals = {};

  allInvoices.forEach((inv) => {
    const total = inv.total || 0;
    const paid = inv.amountPaid || 0;
    const balance = inv.balanceDue || 0;
    const currency = inv.currency || "USD";

    if (!currencyTotals[currency]) {
      currencyTotals[currency] = {
        total: 0,
        paid: 0,
        outstanding: 0,
        count: 0,
      };
    }
    currencyTotals[currency].total += total;
    currencyTotals[currency].paid += paid;
    currencyTotals[currency].outstanding += balance;
    currencyTotals[currency].count += 1;

    // Convert to USD using shared utility
    totalRevenueUSD += convertToUSD(total, currency);
    totalOutstandingUSD += convertToUSD(balance, currency);
    totalPaidUSD += convertToUSD(paid, currency);
  });

  const paymentRate =
    totalRevenueUSD > 0
      ? Math.round((totalPaidUSD / totalRevenueUSD) * 100)
      : 0;

  res.status(200).json({
    success: true,
    data: {
      totalInvoices,
      paidInvoices,
      sentInvoices,
      draftInvoices,
      overdueInvoices,
      cancelledInvoices,
      totalRevenueUSD: Math.round(totalRevenueUSD),
      totalOutstandingUSD: Math.round(totalOutstandingUSD),
      totalPaidUSD: Math.round(totalPaidUSD),
      paymentRate,
      currencyTotals,
    },
  });
});

export const downloadInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOne({
    _id: req.params.id,
    workspace: req.workspace._id,
  }).populate("client", "company.name contacts email phone address");

  if (!invoice) {
    throw new AppError("Invoice not found", 404);
  }

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="Invoice-${invoice.number}.pdf"`,
  );

  await generateInvoicePDF(invoice, res);
});
