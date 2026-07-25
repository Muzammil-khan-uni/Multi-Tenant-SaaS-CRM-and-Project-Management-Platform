import mongoose from "mongoose";
import Project from "../models/Project.js";
import Task from "../models/Task.js";
import Client from "../models/Client.js";
import Invoice from "../models/Invoice.js";
import User from "../models/User.js";
import { AppError, asyncHandler } from "../middleware/errorHandler.js";
import { convertToUSD } from "../utils/currency.js";

export const getDashboardStats = asyncHandler(async (req, res) => {
  const workspaceFilter = { workspace: req.workspace._id };
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalClients,
    activeClients,
    newClientsThisMonth,
    totalProjects,
    activeProjects,
    completedProjects,
    totalTasks,
    pendingTasks,
    inProgressTasks,
    completedTasks,
    overdueTasks,
    totalInvoices,
    paidInvoices,
    pendingInvoices,
    teamMembers,
  ] = await Promise.all([
    Client.countDocuments(workspaceFilter),
    Client.countDocuments({ ...workspaceFilter, status: "active" }),
    Client.countDocuments({
      ...workspaceFilter,
      createdAt: { $gte: startOfMonth },
    }),
    Project.countDocuments({ ...workspaceFilter, isArchived: false }),
    Project.countDocuments({
      ...workspaceFilter,
      status: "active",
      isArchived: false,
    }),
    Project.countDocuments({
      workspace: req.workspace._id,
      status: "completed",
    }),
    Task.countDocuments(workspaceFilter),
    Task.countDocuments({ ...workspaceFilter, status: "todo" }),
    Task.countDocuments({ ...workspaceFilter, status: "in_progress" }),
    Task.countDocuments({ ...workspaceFilter, status: "completed" }),
    Task.countDocuments({
      ...workspaceFilter,
      dueDate: { $lt: now },
      status: { $ne: "completed" },
    }),
    Invoice.countDocuments(workspaceFilter),
    Invoice.countDocuments({ ...workspaceFilter, status: "paid" }),
    Invoice.countDocuments({
      ...workspaceFilter,
      status: { $in: ["sent", "draft"] },
    }),
    User.countDocuments({
      workspaceMemberships: {
        $elemMatch: { workspace: req.workspace._id, isActive: true },
      },
      isActive: true,
    }),
  ]);

  const allPaidInvoices = await Invoice.find({
    workspace: req.workspace._id,
    status: "paid",
  }).lean();

  let totalRevenue = 0;
  let revenueThisMonth = 0;

  allPaidInvoices.forEach((inv) => {
    const amount = inv.amountPaid || inv.total || 0;
    const usdAmount = convertToUSD(amount, inv.currency);
    totalRevenue += usdAmount;

    const paidDate = new Date(inv.paidDate || inv.updatedAt);
    if (paidDate >= startOfMonth) {
      revenueThisMonth += usdAmount;
    }
  });

  const monthlyRevenueMap = {};

  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthlyRevenueMap[key] = { revenue: 0, count: 0 };
  }

  allPaidInvoices.forEach((inv) => {
    const paidDate = new Date(inv.paidDate || inv.updatedAt);
    if (paidDate) {
      const key = `${paidDate.getFullYear()}-${String(paidDate.getMonth() + 1).padStart(2, "0")}`;
      if (monthlyRevenueMap[key] !== undefined) {
        monthlyRevenueMap[key].revenue += convertToUSD(
          inv.amountPaid || inv.total || 0,
          inv.currency,
        );
        monthlyRevenueMap[key].count += 1;
      }
    }
  });

  const monthlyRevenue = Object.entries(monthlyRevenueMap)
    .map(([month, data]) => ({
      month,
      revenue: Math.round(data.revenue),
      invoices: data.count,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  const tasksByStatus = await Task.aggregate([
    { $match: workspaceFilter },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);

  const statusOrder = ["todo", "in_progress", "review", "completed"];
  const sortedTasksByStatus = statusOrder.map((status) => {
    const found = tasksByStatus.find((t) => t._id === status);
    return found || { _id: status, count: 0 };
  });

  const projectsByStatus = await Project.aggregate([
    { $match: { workspace: req.workspace._id } }, // Removed isArchived filter
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);

  const teamPerformance = await User.aggregate([
    {
      $match: {
        workspaceMemberships: {
          $elemMatch: { workspace: req.workspace._id, isActive: true },
        },
        isActive: true,
      },
    },
    {
      $lookup: {
        from: "tasks",
        let: { userId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $in: ["$$userId", "$assignedTo.user"],
              },
              workspace: req.workspace._id,
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              completed: {
                $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
              },
            },
          },
        ],
        as: "taskStats",
      },
    },
    {
      $project: {
        name: { $concat: ["$firstName", " ", "$lastName"] },
        email: 1,
        avatar: 1,
        role: 1,
        totalTasks: { $ifNull: [{ $arrayElemAt: ["$taskStats.total", 0] }, 0] },
        completedTasks: {
          $ifNull: [{ $arrayElemAt: ["$taskStats.completed", 0] }, 0],
        },
      },
    },
    { $sort: { completedTasks: -1 } },
    { $limit: 10 },
  ]);

  const projectProgress = await Project.aggregate([
    {
      $match: {
        ...workspaceFilter,
        isArchived: false,
        status: { $ne: "completed" },
      },
    },
    {
      $project: {
        name: 1,
        progress: 1,
        status: 1,
        deadline: "$timeline.deadline",
        daysLeft: {
          $ceil: {
            $divide: [
              { $subtract: ["$timeline.deadline", now] },
              1000 * 60 * 60 * 24,
            ],
          },
        },
      },
    },
    { $sort: { daysLeft: 1 } },
    { $limit: 10 },
  ]);

  res.status(200).json({
    success: true,
    data: {
      summary: {
        totalClients,
        activeClients,
        newClientsThisMonth,
        totalProjects,
        activeProjects,
        completedProjects,
        totalTasks,
        pendingTasks,
        inProgressTasks,
        completedTasks,
        overdueTasks,
        totalInvoices,
        paidInvoices,
        pendingInvoices,
        teamMembers,
        totalRevenue: Math.round(totalRevenue),
        revenueThisMonth: Math.round(revenueThisMonth),
      },
      charts: {
        monthlyRevenue,
        tasksByStatus: sortedTasksByStatus,
        projectsByStatus,
      },
      teamPerformance,
      projectProgress,
    },
  });
});
