import mongoose from "mongoose";
import Project from "../models/Project.js";
import Task from "../models/Task.js";
import Client from "../models/Client.js";
import Invoice from "../models/Invoice.js";
import User from "../models/User.js";
import Employee from "../models/Employee.js";
import { AppError, asyncHandler } from "../middleware/errorHandler.js";
import { convertToUSD } from "../utils/currency.js";
import { generateReportPDF } from "../services/reportPdfService.js";

export const getEmployeePerformance = asyncHandler(async (req, res) => {
  const workspaceFilter = { workspace: req.workspace._id };
  const { startDate, endDate } = req.query;

  if (startDate) workspaceFilter.createdAt = { $gte: new Date(startDate) };
  if (endDate)
    workspaceFilter.createdAt = {
      ...workspaceFilter.createdAt,
      $lte: new Date(endDate),
    };

  const performance = await Task.aggregate([
    { $match: workspaceFilter },
    { $unwind: "$assignedTo" },
    {
      $group: {
        _id: "$assignedTo.user",
        totalTasks: { $sum: 1 },
        completedTasks: {
          $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
        },
        inProgressTasks: {
          $sum: { $cond: [{ $eq: ["$status", "in_progress"] }, 1, 0] },
        },
        overdueTasks: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $lt: ["$dueDate", new Date()] },
                  { $ne: ["$status", "completed"] },
                ],
              },
              1,
              0,
            ],
          },
        },
        totalHours: { $sum: "$actualHours" },
        highPriority: {
          $sum: { $cond: [{ $in: ["$priority", ["high", "urgent"]] }, 1, 0] },
        },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: "$user" },

    {
      $addFields: {
        _wsMembership: {
          $first: {
            $filter: {
              input: { $ifNull: ["$user.workspaceMemberships", []] },
              as: "mem",
              cond: { $eq: ["\\\$\\mem.workspace", req.workspace._id] },
            },
          },
        },
      },
    },
    {
      $project: {
        name: { $concat: ["$user.firstName", " ", "$user.lastName"] },
        email: "$user.email",
        avatar: "$user.avatar",
        role: { $ifNull: ["$_wsMembership.role", "employee"] },
        totalTasks: 1,
        completedTasks: 1,
        inProgressTasks: 1,
        overdueTasks: 1,
        totalHours: 1,
        highPriority: 1,
        completionRate: {
          $cond: [
            { $gt: ["$totalTasks", 0] },
            {
              $round: [
                {
                  $multiply: [
                    { $divide: ["$completedTasks", "$totalTasks"] },
                    100,
                  ],
                },
                1,
              ],
            },
            0,
          ],
        },
      },
    },
    { $sort: { completionRate: -1 } },
  ]);

  res.status(200).json({ success: true, data: performance });
});

export const getProjectProgress = asyncHandler(async (req, res) => {
  const workspaceFilter = { workspace: req.workspace._id, isArchived: false };

  const projects = await Project.find(workspaceFilter)
    .populate("client", "company.name")
    .populate("team.user", "firstName lastName")
    .lean();

  const enriched = await Promise.all(
    projects.map(async (project) => {
      const [taskStats] = await Task.aggregate([
        { $match: { project: project._id } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            completed: {
              $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
            },
          },
        },
      ]);

      const taskData = taskStats || { total: 0, completed: 0 };
      const milestoneTotal = project.milestones?.length || 0;
      const milestoneCompleted =
        project.milestones?.filter((m) => m.status === "completed").length || 0;

      return {
        _id: project._id,
        name: project.name,
        status: project.status,
        priority: project.priority,
        progress: project.progress || 0,
        budget: project.budget,
        timeline: project.timeline,
        clientName: project.client?.company?.name || null,
        totalTasks: taskData.total,
        completedTasks: taskData.completed,
        taskCompletionRate:
          taskData.total > 0
            ? Math.round((taskData.completed / taskData.total) * 100)
            : 0,
        teamSize: project.team?.length || 0,
        totalMilestones: milestoneTotal,
        completedMilestones: milestoneCompleted,
        milestoneCompletionRate:
          milestoneTotal > 0
            ? Math.round((milestoneCompleted / milestoneTotal) * 100)
            : 0,
        isOverdue:
          project.timeline?.deadline &&
          new Date(project.timeline.deadline) < new Date() &&
          project.status !== "completed",
        budgetUtilization:
          project.budget?.estimated > 0
            ? Math.round(
                ((project.budget.actual || 0) / project.budget.estimated) * 100,
              )
            : 0,
      };
    }),
  );

  res.status(200).json({ success: true, data: enriched });
});

export const getTaskCompletion = asyncHandler(async (req, res) => {
  const workspaceFilter = { workspace: req.workspace._id };
  const completedFilter = { ...workspaceFilter, status: "completed" };
  const { startDate, endDate } = req.query;

  if (startDate) {
    completedFilter.completedAt = { $gte: new Date(startDate) };
    workspaceFilter.createdAt = { $gte: new Date(startDate) };
  }
  if (endDate) {
    completedFilter.completedAt = {
      ...(completedFilter.completedAt || {}),
      $lte: new Date(endDate),
    };
    workspaceFilter.createdAt = {
      ...(workspaceFilter.createdAt || {}),
      $lte: new Date(endDate),
    };
  }

  const [
    byPriority,
    byProject,
    completionOverTime,
    avgCompletionTime,
    totalTasks,
    totalCompletedTasks,
  ] = await Promise.all([
    Task.aggregate([
      { $match: completedFilter },
      { $group: { _id: "$priority", count: { $sum: 1 } } },
    ]),
    Task.aggregate([
      { $match: completedFilter },
      { $group: { _id: "$project", count: { $sum: 1 } } },
      {
        $lookup: {
          from: "projects",
          localField: "_id",
          foreignField: "_id",
          as: "project",
        },
      },
      { $unwind: "$project" },
      { $project: { projectName: "$project.name", count: 1 } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
    Task.aggregate([
      { $match: completedFilter },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$completedAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Task.aggregate([
      { $match: completedFilter },
      {
        $group: {
          _id: null,
          avgHours: {
            $avg: {
              $divide: [{ $subtract: ["$completedAt", "$createdAt"] }, 3600000],
            },
          },
        },
      },
    ]),
    Task.countDocuments(workspaceFilter),
    Task.countDocuments(completedFilter),
  ]);

  res.status(200).json({
    success: true,
    data: {
      totalTasks,
      totalCompletedTasks,
      byPriority,
      byProject,
      completionOverTime,
      avgCompletionHours: Math.round(avgCompletionTime[0]?.avgHours || 0),
    },
  });
});

export const getRevenueSummary = asyncHandler(async (req, res) => {
  const workspaceFilter = { workspace: req.workspace._id, status: "paid" };
  const { startDate, endDate } = req.query;

  if (startDate) workspaceFilter.paidDate = { $gte: new Date(startDate) };
  if (endDate)
    workspaceFilter.paidDate = {
      ...(workspaceFilter.paidDate || {}),
      $lte: new Date(endDate),
    };

  const allPaidInvoices = await Invoice.find({
    workspace: req.workspace._id,
    status: "paid",
  });

  const filteredInvoices = await Invoice.find(workspaceFilter)
    .populate("client", "company.name")
    .sort("-paidDate");

  let totalRevenueUSD = 0;
  allPaidInvoices.forEach((inv) => {
    totalRevenueUSD += convertToUSD(
      inv.amountPaid || inv.total || 0,
      inv.currency,
    );
  });

  let filteredRevenueUSD = 0;
  filteredInvoices.forEach((inv) => {
    filteredRevenueUSD += convertToUSD(
      inv.amountPaid || inv.total || 0,
      inv.currency,
    );
  });

  const avgInvoice =
    filteredInvoices.length > 0
      ? Math.round(filteredRevenueUSD / filteredInvoices.length)
      : 0;

  const clientRevenue = {};
  filteredInvoices.forEach((inv) => {
    const clientId = inv.client?._id?.toString() || "unknown";
    const clientName = inv.client?.company?.name || "Unknown";
    if (!clientRevenue[clientId]) {
      clientRevenue[clientId] = { clientName, total: 0, count: 0 };
    }
    clientRevenue[clientId].total += Math.round(
      convertToUSD(inv.amountPaid || inv.total || 0, inv.currency),
    );
    clientRevenue[clientId].count += 1;
  });

  const byClient = Object.values(clientRevenue)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  const monthlyRevenue = {};
  filteredInvoices.forEach((inv) => {
    if (inv.paidDate) {
      const month = `${inv.paidDate.getFullYear()}-${String(inv.paidDate.getMonth() + 1).padStart(2, "0")}`;
      if (!monthlyRevenue[month])
        monthlyRevenue[month] = { revenue: 0, count: 0 };
      monthlyRevenue[month].revenue += Math.round(
        convertToUSD(inv.amountPaid || inv.total || 0, inv.currency),
      );
      monthlyRevenue[month].count += 1;
    }
  });

  const revenueOverTime = Object.entries(monthlyRevenue)
    .map(([month, data]) => ({ _id: month, ...data }))
    .sort((a, b) => a._id.localeCompare(b._id));

  let monthlyGrowth = 0;
  if (revenueOverTime.length >= 2) {
    const last = revenueOverTime[revenueOverTime.length - 1];
    const prev = revenueOverTime[revenueOverTime.length - 2];
    if (prev.revenue > 0)
      monthlyGrowth = Math.round(
        ((last.revenue - prev.revenue) / prev.revenue) * 100,
      );
  }

  res.status(200).json({
    success: true,
    data: {
      totalRevenue: Math.round(totalRevenueUSD),
      filteredRevenue: Math.round(filteredRevenueUSD),
      averageInvoice: avgInvoice,
      totalInvoices: filteredInvoices.length,
      revenueOverTime,
      byClient,
      monthlyGrowth,
      monthsTracked: revenueOverTime.length,
    },
  });
});

export const exportReport = asyncHandler(async (req, res) => {
  const { type, format = "json", startDate, endDate } = req.body;
  const workspaceFilter = { workspace: req.workspace._id };

  let data;
  let filename;

  switch (type) {
    case "employee-performance": {
      if (startDate) workspaceFilter.createdAt = { $gte: new Date(startDate) };
      if (endDate)
        workspaceFilter.createdAt = {
          ...workspaceFilter.createdAt,
          $lte: new Date(endDate),
        };

      const performance = await Task.aggregate([
        { $match: workspaceFilter },
        { $unwind: "$assignedTo" },
        {
          $group: {
            _id: "$assignedTo.user",
            totalTasks: { $sum: 1 },
            completedTasks: {
              $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
            },
            overdueTasks: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $lt: ["$dueDate", new Date()] },
                      { $ne: ["$status", "completed"] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            totalHours: { $sum: "$actualHours" },
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "user",
          },
        },
        { $unwind: "$user" },
        {
          $project: {
            name: { $concat: ["$user.firstName", " ", "$user.lastName"] },
            email: "$user.email",
            totalTasks: 1,
            completedTasks: 1,
            overdueTasks: 1,
            totalHours: 1,
            completionRate: {
              $cond: [
                { $gt: ["$totalTasks", 0] },
                {
                  $round: [
                    {
                      $multiply: [
                        { $divide: ["$completedTasks", "$totalTasks"] },
                        100,
                      ],
                    },
                    1,
                  ],
                },
                0,
              ],
            },
          },
        },
        { $sort: { completionRate: -1 } },
      ]);
      data = performance;
      filename = "employee-performance-report";
      break;
    }
    case "project-progress": {
      const projects = await Project.find({
        ...workspaceFilter,
        isArchived: false,
      })
        .populate("client", "company.name")
        .lean();
      data = await Promise.all(
        projects.map(async (project) => {
          const taskStats = await Task.aggregate([
            { $match: { project: project._id } },
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                completed: {
                  $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
                },
              },
            },
          ]);
          const td = taskStats[0] || { total: 0, completed: 0 };
          return {
            name: project.name,
            status: project.status,
            progress: project.progress || 0,
            clientName: project.client?.company?.name || null,
            totalTasks: td.total,
            completedTasks: td.completed,
            taskCompletionRate:
              td.total > 0 ? Math.round((td.completed / td.total) * 100) : 0,
            budgetUtilization:
              project.budget?.estimated > 0
                ? Math.round(
                    ((project.budget.actual || 0) / project.budget.estimated) *
                      100,
                  )
                : 0,
          };
        }),
      );
      filename = "project-progress-report";
      break;
    }
    case "task-completion": {
      const completedFilter = { ...workspaceFilter, status: "completed" };
      if (startDate)
        completedFilter.completedAt = { $gte: new Date(startDate) };
      if (endDate)
        completedFilter.completedAt = {
          ...completedFilter.completedAt,
          $lte: new Date(endDate),
        };

      const [
        byPriority,
        byProject,
        totalTasks,
        totalCompletedTasks,
        avgCompletionTime,
      ] = await Promise.all([
        Task.aggregate([
          { $match: completedFilter },
          { $group: { _id: "$priority", count: { $sum: 1 } } },
        ]),
        Task.aggregate([
          { $match: completedFilter },
          { $group: { _id: "$project", count: { $sum: 1 } } },
          {
            $lookup: {
              from: "projects",
              localField: "_id",
              foreignField: "_id",
              as: "project",
            },
          },
          { $unwind: "$project" },
          { $project: { projectName: "$project.name", count: 1 } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ]),
        Task.countDocuments(workspaceFilter),
        Task.countDocuments(completedFilter),
        Task.aggregate([
          { $match: completedFilter },
          {
            $group: {
              _id: null,
              avgHours: {
                $avg: {
                  $divide: [
                    { $subtract: ["$completedAt", "$createdAt"] },
                    3600000,
                  ],
                },
              },
            },
          },
        ]),
      ]);

      data = {
        totalTasks,
        totalCompletedTasks,
        byPriority,
        byProject,
        avgCompletionHours: Math.round(avgCompletionTime[0]?.avgHours || 0),
      };
      filename = "task-completion-report";
      break;
    }
    case "revenue": {
      const revFilter = { ...workspaceFilter, status: "paid" };
      if (startDate) revFilter.paidDate = { $gte: new Date(startDate) };
      if (endDate)
        revFilter.paidDate = { ...revFilter.paidDate, $lte: new Date(endDate) };

      const invoices = await Invoice.find(revFilter)
        .populate("client", "company.name")
        .sort("-paidDate");
      let totalRevenue = 0;
      invoices.forEach((inv) => {
        totalRevenue += convertToUSD(
          inv.amountPaid || inv.total || 0,
          inv.currency,
        );
      });

      data = {
        totalRevenue: Math.round(totalRevenue),
        totalInvoices: invoices.length,
        averageInvoice:
          invoices.length > 0 ? Math.round(totalRevenue / invoices.length) : 0,
        invoices: invoices.map((inv) => ({
          number: inv.number,
          clientName: inv.client?.company?.name || "N/A",
          total: inv.total,
          paid: inv.amountPaid,
          currency: inv.currency,
          paidDate: inv.paidDate,
        })),
      };
      filename = "revenue-report";
      break;
    }
    default:
      throw new AppError("Invalid report type", 400);
  }

  if (format === "csv") {
    let csvData;

    if (type === "task-completion") {
      csvData = [];

      csvData.push({
        Category: "SUMMARY",
        Detail: "Total Tasks",
        Value: data.totalTasks || 0,
      });
      csvData.push({
        Category: "SUMMARY",
        Detail: "Completed Tasks",
        Value: data.totalCompletedTasks || 0,
      });
      csvData.push({
        Category: "SUMMARY",
        Detail: "Completion Rate",
        Value: `${data.totalTasks > 0 ? Math.round((data.totalCompletedTasks / data.totalTasks) * 100) : 0}%`,
      });
      csvData.push({
        Category: "SUMMARY",
        Detail: "Avg Completion Time",
        Value: `${data.avgCompletionHours || 0} hours`,
      });

      (data.byPriority || []).forEach((p) => {
        csvData.push({
          Category: "BY PRIORITY",
          Detail: p._id || "Unknown",
          Value: p.count || 0,
        });
      });

      (data.byProject || []).forEach((p) => {
        csvData.push({
          Category: "BY PROJECT",
          Detail: p.projectName || "Unknown",
          Value: p.count || 0,
        });
      });
    } else if (type === "revenue") {
      csvData = (data.invoices || []).map((inv) => ({
        Number: inv.number,
        Client: inv.clientName,
        Total: inv.total,
        Paid: inv.paid,
        Currency: inv.currency,
        "Paid Date": inv.paidDate?.toISOString().split("T")[0] || "N/A",
      }));
    } else {
      csvData = Array.isArray(data) ? data : [data];
    }

    const csv = convertToCSV(csvData);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}.csv"`,
    );
    return res.send(csv);
  }

  if (format === "pdf") {
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}.pdf"`,
    );
    return await generateReportPDF(type, data, res);
  }

  res.status(200).json({ success: true, data });
});

async function getEmployeeDataForExport(filter, startDate, endDate) {
  if (startDate) filter.createdAt = { $gte: new Date(startDate) };
  if (endDate)
    filter.createdAt = { ...filter.createdAt, $lte: new Date(endDate) };
  const tasks = await Task.aggregate([
    { $match: filter },
    { $unwind: "$assignedTo" },
    {
      $group: {
        _id: "$assignedTo.user",
        total: { $sum: 1 },
        completed: {
          $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
        },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: "$user" },
  ]);
  return tasks.map((t) => ({
    Name: `${t.user.firstName} ${t.user.lastName}`,
    Email: t.user.email,
    "Total Tasks": t.total,
    "Completed Tasks": t.completed,
    "Completion Rate":
      t.total > 0 ? Math.round((t.completed / t.total) * 100) + "%" : "0%",
  }));
}

async function getProjectDataForExport(filter) {
  const projects = await Project.find({
    ...filter,
    isArchived: false,
  }).populate("client", "company.name");
  return projects.map((p) => ({
    Name: p.name,
    Client: p.client?.company?.name || "N/A",
    Status: p.status,
    Progress: p.progress + "%",
    Deadline: p.timeline?.deadline?.toISOString().split("T")[0] || "N/A",
    Budget: p.budget?.estimated || 0,
  }));
}

async function getTaskDataForExport(filter, startDate, endDate) {
  if (startDate) filter.completedAt = { $gte: new Date(startDate) };
  if (endDate)
    filter.completedAt = { ...filter.completedAt, $lte: new Date(endDate) };
  filter.status = "completed";
  const tasks = await Task.find(filter)
    .populate("project", "name")
    .populate("assignedTo.user", "firstName lastName");
  return tasks.map((t) => ({
    Title: t.title,
    Project: t.project?.name || "N/A",
    Priority: t.priority,
    "Completed At": t.completedAt?.toISOString().split("T")[0] || "N/A",
    "Assigned To":
      t.assignedTo
        ?.map((a) => `${a.user?.firstName} ${a.user?.lastName}`)
        .join(", ") || "Unassigned",
  }));
}

async function getRevenueDataForExport(filter, startDate, endDate) {
  if (startDate) filter.paidDate = { $gte: new Date(startDate) };
  if (endDate)
    filter.paidDate = { ...filter.paidDate, $lte: new Date(endDate) };
  filter.status = "paid";
  const invoices = await Invoice.find(filter).populate(
    "client",
    "company.name",
  );
  return invoices.map((inv) => ({
    Number: inv.number,
    Client: inv.client?.company?.name || "N/A",
    Total: inv.total,
    Paid: inv.amountPaid,
    Currency: inv.currency,
    "Paid Date": inv.paidDate?.toISOString().split("T")[0] || "N/A",
  }));
}

async function getEmployeeData(filter, startDate, endDate) {
  if (startDate) filter.createdAt = { $gte: new Date(startDate) };
  if (endDate)
    filter.createdAt = { ...filter.createdAt, $lte: new Date(endDate) };

  const tasks = await Task.aggregate([
    { $match: filter },
    { $unwind: "$assignedTo" },
    {
      $group: {
        _id: "$assignedTo.user",
        total: { $sum: 1 },
        completed: {
          $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
        },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: "$user" },
  ]);

  return tasks.map((t) => ({
    Name: `${t.user.firstName} ${t.user.lastName}`,
    Email: t.user.email,
    "Total Tasks": t.total,
    "Completed Tasks": t.completed,
    "Completion Rate":
      t.total > 0 ? Math.round((t.completed / t.total) * 100) + "%" : "0%",
  }));
}

async function getProjectData(filter) {
  const projects = await Project.find({
    ...filter,
    isArchived: false,
  }).populate("client", "company.name");
  return projects.map((p) => ({
    Name: p.name,
    Client: p.client?.company?.name || "N/A",
    Status: p.status,
    Progress: p.progress + "%",
    Deadline: p.timeline?.deadline?.toISOString().split("T")[0] || "N/A",
    Budget: p.budget?.estimated || 0,
  }));
}

async function getTaskData(filter, startDate, endDate) {
  if (startDate) filter.completedAt = { $gte: new Date(startDate) };
  if (endDate)
    filter.completedAt = { ...filter.completedAt, $lte: new Date(endDate) };
  filter.status = "completed";

  const tasks = await Task.find(filter)
    .populate("project", "name")
    .populate("assignedTo.user", "firstName lastName");
  return tasks.map((t) => ({
    Title: t.title,
    Project: t.project?.name || "N/A",
    Priority: t.priority,
    "Completed At": t.completedAt?.toISOString().split("T")[0] || "N/A",
    "Assigned To":
      t.assignedTo
        ?.map((a) => `${a.user?.firstName} ${a.user?.lastName}`)
        .join(", ") || "Unassigned",
  }));
}

async function getRevenueData(filter, startDate, endDate) {
  if (startDate) filter.paidDate = { $gte: new Date(startDate) };
  if (endDate)
    filter.paidDate = { ...filter.paidDate, $lte: new Date(endDate) };
  filter.status = "paid";

  const invoices = await Invoice.find(filter).populate(
    "client",
    "company.name",
  );
  return invoices.map((inv) => ({
    Number: inv.number,
    Client: inv.client?.company?.name || "N/A",
    Total: inv.total,
    Paid: inv.amountPaid,
    Currency: inv.currency,
    "Paid Date": inv.paidDate?.toISOString().split("T")[0] || "N/A",
  }));
}

function convertToCSV(data) {
  if (!data || data.length === 0) return "";
  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers
      .map((h) => `"${String(row[h] || "").replace(/"/g, '""')}"`)
      .join(","),
  );
  return [headers.join(","), ...rows].join("\n");
}
