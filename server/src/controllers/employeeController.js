import Employee from "../models/Employee.js";
import User from "../models/User.js";
import Department from "../models/Department.js";
import Workspace from "../models/Workspace.js";
import Task from "../models/Task.js";
import Project from "../models/Project.js";
import { AppError, asyncHandler } from "../middleware/errorHandler.js";
import { getRolePermissions } from "../config/permissions.js";
import emailService from "../services/emailService.js";

export const getEmployees = asyncHandler(async (req, res) => {
  const { status, department, search, role } = req.query;
  const filter = { workspace: req.workspace._id };

  if (status) filter.status = status;
  if (department) filter["department.name"] = department;
  if (role) filter["position.level"] = role;
  if (search) {
    const searchRegex = new RegExp(search, "i");
    filter.$or = [
      { employeeId: searchRegex },
      { "position.title": searchRegex },
    ];

    const users = await User.find({
      workspace: req.workspace._id,
      $or: [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
      ],
    }).select("_id");
    if (users.length > 0) {
      filter.$or.push({ user: { $in: users.map((u) => u._id) } });
    }
  }

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const [employees, totalCount] = await Promise.all([
    Employee.find(filter)
      .populate("user", "firstName lastName email avatar role isActive")
      .populate("department.manager", "firstName lastName email")
      .sort("-createdAt")
      .skip(skip)
      .limit(limit),
    Employee.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    count: employees.length,
    pagination: {
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
      totalCount,
    },
    data: employees,
  });
});

export const getEmployee = asyncHandler(async (req, res) => {
  const employee = await Employee.findOne({
    _id: req.params.id,
    workspace: req.workspace._id,
  }).populate(
    "user",
    "firstName lastName email avatar role permissions isActive lastLogin",
  );

  if (!employee) {
    throw new AppError("Employee not found", 404);
  }

  res.status(200).json({
    success: true,
    data: employee,
  });
});

export const createEmployee = asyncHandler(async (req, res) => {
  const {
    firstName,
    lastName,
    email,
    password,
    department,
    position,
    employmentType,
    phone,
    hireDate,
    dateOfBirth,
    gender,
    probationEndDate,
    address,
    salary,
  } = req.body;

  const normalizedEmail = email?.toLowerCase();
  const employeeRole = req.body.role || "employee";
  const plainPassword = password || "Temp@123!"; // kept in memory only, to include in the welcome email below

  let user = await User.findOne({ email: normalizedEmail });

  if (user) {
    const existingMembership = user.getMembership(req.workspace._id);
    if (existingMembership && existingMembership.isActive) {
      throw new AppError(
        "A user with this email already exists in this workspace",
        400,
      );
    }

    const existingEmployee = await Employee.findOne({
      workspace: req.workspace._id,
      user: user._id,
    });
    if (existingEmployee) {
      throw new AppError(
        "An employee record already exists for this user in this workspace",
        400,
      );
    }

    user.addOrUpdateMembership({
      workspace: req.workspace._id,
      role: employeeRole,
      permissions: getRolePermissions(employeeRole),
      invitedBy: req.user?._id,
    });
    user.firstName = firstName || user.firstName;
    user.lastName = lastName || user.lastName;
    user.password = plainPassword; // reset credentials since we're re-issuing them below
    user.isActive = true;

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();
  } else {
    user = await User.create({
      firstName,
      lastName,
      email: normalizedEmail,
      password: plainPassword,

      isEmailVerified: true,
      workspaceMemberships: [
        {
          workspace: req.workspace._id,
          role: employeeRole,
          permissions: getRolePermissions(employeeRole),
          isActive: true,
          joinedAt: new Date(),
          invitedBy: req.user?._id,
        },
      ],
      phone: phone || "",
      position: position?.title || "",
      department: department?.name || "",
    });
  }

  const employeeData = {
    workspace: req.workspace._id,
    user: user._id,
    department: department || {},
    position: {
      title: position?.title || "",
      level: position?.level || "junior",
      startDate: hireDate || new Date(),
    },
    employmentType: employmentType || "full_time",
    status: "active",
    personalInfo: {
      phone: phone || "",
      dateOfBirth:
        dateOfBirth || req.body.personalInfo?.dateOfBirth || undefined,
      gender: gender || req.body.personalInfo?.gender || undefined,
      address: address || req.body.personalInfo?.address || {},
    },
    workInfo: {
      hireDate: hireDate || new Date(),
      probationEndDate:
        probationEndDate || req.body.workInfo?.probationEndDate || undefined,
      salary: {
        amount: salary?.amount || req.body.workInfo?.salary?.amount || 0,
        currency:
          salary?.currency || req.body.workInfo?.salary?.currency || "USD",
        type: salary?.type || req.body.workInfo?.salary?.type || "annual",
      },
    },
  };

  if (department?.name) {
    const dept = await Department.findOne({
      workspace: req.workspace._id,
      name: department.name,
      isActive: true,
    });
    if (dept) {
      employeeData.department = {
        name: dept.name,
        code: dept.code,
        manager: dept.manager,
      };
      dept.employees.push(user._id);
      await dept.save();
    }
  }

  const employee = await Employee.create(employeeData);

  const populatedEmployee = await Employee.findById(employee._id).populate(
    "user",
    "firstName lastName email avatar role",
  );

  try {
    await emailService.sendEmployeeWelcomeEmail(
      user,
      req.workspace,
      plainPassword,
      {
        role: employeeRole,
        employeeId: employee.employeeId,
        position: employee.position,
        department: employee.department,
        employmentType: employee.employmentType,
        workInfo: employee.workInfo,
      },
    );
  } catch (emailError) {
    console.warn(
      "[Employee] Welcome email failed to send:",
      emailError.message,
    );
  }

  res.status(201).json({
    success: true,
    message: "Employee created successfully",
    data: populatedEmployee,
  });
});

export const updateEmployee = asyncHandler(async (req, res) => {
  const employee = await Employee.findOne({
    _id: req.params.id,
    workspace: req.workspace._id,
  });

  if (!employee) {
    throw new AppError("Employee not found", 404);
  }

  if (req.body.employmentType)
    employee.employmentType = req.body.employmentType;
  if (req.body.status) employee.status = req.body.status;

  if (req.body.position) {
    employee.position = {
      ...employee.position?.toObject(),
      ...req.body.position,
    };
    employee.markModified("position");
  }

  if (req.body.department) {
    if (req.body.department.name !== employee.department?.name) {
      if (employee.department?.name) {
        await Department.findOneAndUpdate(
          { workspace: req.workspace._id, name: employee.department.name },
          { $pull: { employees: employee.user } },
        );
      }
      if (req.body.department.name) {
        await Department.findOneAndUpdate(
          { workspace: req.workspace._id, name: req.body.department.name },
          { $addToSet: { employees: employee.user } },
        );
      }
    }
    employee.department = {
      ...employee.department?.toObject(),
      ...req.body.department,
    };
    employee.markModified("department");
  }

  if (req.body.personalInfo) {
    employee.personalInfo = {
      ...employee.personalInfo?.toObject(),
      ...req.body.personalInfo,
    };
    employee.markModified("personalInfo");
  }

  if (req.body.workInfo) {
    if (req.body.workInfo.salary) {
      employee.workInfo = {
        ...employee.workInfo?.toObject(),
        salary: {
          ...(employee.workInfo?.salary?.toObject?.() ||
            employee.workInfo?.salary),
          ...req.body.workInfo.salary,
        },
      };
    }
    if (req.body.workInfo.hireDate) {
      employee.workInfo = {
        ...employee.workInfo?.toObject(),
        hireDate: req.body.workInfo.hireDate,
      };
    }
    if (req.body.workInfo.probationEndDate !== undefined) {
      employee.workInfo = {
        ...employee.workInfo?.toObject(),
        probationEndDate: req.body.workInfo.probationEndDate,
      };
    }
    employee.markModified("workInfo");
  }

  await employee.save();

  if (
    req.body.firstName ||
    req.body.lastName ||
    req.body.phone ||
    req.body.role
  ) {
    const userUpdate = {};
    if (req.body.firstName) userUpdate.firstName = req.body.firstName;
    if (req.body.lastName) userUpdate.lastName = req.body.lastName;
    if (req.body.phone) userUpdate.phone = req.body.phone;

    if (req.body.role) {
      const userDoc = await User.findById(employee.user);
      if (userDoc) {
        userDoc.addOrUpdateMembership({
          workspace: req.workspace._id,
          role: req.body.role,
          permissions: getRolePermissions(req.body.role),
        });
        Object.assign(userDoc, userUpdate);
        await userDoc.save({ validateBeforeSave: false });
      }
    } else if (Object.keys(userUpdate).length > 0) {
      await User.findByIdAndUpdate(employee.user, userUpdate, { new: true });
    }
  }

  const updatedEmployee = await Employee.findById(employee._id)
    .populate("user", "firstName lastName email avatar role phone isActive")
    .populate("department.manager", "firstName lastName email");

  res.status(200).json({
    success: true,
    message: "Employee updated successfully",
    data: updatedEmployee,
  });
});

export const terminateEmployee = asyncHandler(async (req, res) => {
  const employee = await Employee.findOne({
    _id: req.params.id,
    workspace: req.workspace._id,
  });

  if (!employee) {
    throw new AppError("Employee not found", 404);
  }

  const workspace = await Workspace.findById(req.workspace._id);
  if (
    workspace &&
    workspace.owner &&
    workspace.owner.toString() === employee.user.toString()
  ) {
    throw new AppError("Cannot terminate the workspace owner", 400);
  }

  employee.status = "terminated";

  if (employee.workInfo) {
    employee.workInfo.terminationDate = req.body.terminationDate || new Date();
    employee.workInfo.terminationReason = req.body.reason || "Not specified";
  } else {
    employee.workInfo = {
      terminationDate: req.body.terminationDate || new Date(),
      terminationReason: req.body.reason || "Not specified",
    };
  }

  employee.markModified("workInfo");

  await employee.save();

  await User.findByIdAndUpdate(employee.user, {
    isActive: false,
  });

  if (employee.department?.name) {
    await Department.findOneAndUpdate(
      { workspace: req.workspace._id, name: employee.department.name },
      { $pull: { employees: employee.user } },
    );
  }

  await Project.updateMany(
    { workspace: req.workspace._id, "team.user": employee.user },
    { $pull: { team: { user: employee.user } } },
  );

  const updatedEmployee = await Employee.findById(employee._id).populate(
    "user",
    "firstName lastName email isActive",
  );

  res.status(200).json({
    success: true,
    message: "Employee terminated successfully",
    data: updatedEmployee,
  });
});

export const reactivateEmployee = asyncHandler(async (req, res) => {
  const employee = await Employee.findOne({
    _id: req.params.id,
    workspace: req.workspace._id,
    status: "terminated",
  });

  if (!employee) {
    throw new AppError("Terminated employee not found", 404);
  }

  employee.status = "active";

  if (employee.workInfo) {
    employee.workInfo.terminationDate = undefined;
    employee.workInfo.terminationReason = undefined;
    employee.markModified("workInfo");
  }

  await employee.save();

  await User.findByIdAndUpdate(employee.user, { isActive: true });

  if (employee.department?.name) {
    await Department.findOneAndUpdate(
      { workspace: req.workspace._id, name: employee.department.name },
      { $addToSet: { employees: employee.user } },
    );
  }

  const updatedEmployee = await Employee.findById(employee._id).populate(
    "user",
    "firstName lastName email isActive",
  );

  res.status(200).json({
    success: true,
    message: "Employee reactivated successfully",
    data: updatedEmployee,
  });
});

export const markOnLeave = asyncHandler(async (req, res) => {
  const { leaveType, startDate, endDate, reason, totalDays } = req.body;

  if (!startDate || !endDate) {
    throw new AppError("Start date and end date are required", 400);
  }

  const employee = await Employee.findOne({
    _id: req.params.id,
    workspace: req.workspace._id,
  });

  if (!employee) {
    throw new AppError("Employee not found", 404);
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = totalDays || Math.ceil((end - start) / (1000 * 60 * 60 * 24));

  if (leaveType === "annual" && employee.leaveBalance.annual < days) {
    throw new AppError(
      `Insufficient annual leave balance. Available: ${employee.leaveBalance.annual} days`,
      400,
    );
  }
  if (leaveType === "sick" && employee.leaveBalance.sick < days) {
    throw new AppError(
      `Insufficient sick leave balance. Available: ${employee.leaveBalance.sick} days`,
      400,
    );
  }
  if (leaveType === "personal" && employee.leaveBalance.personal < days) {
    throw new AppError(
      `Insufficient personal leave balance. Available: ${employee.leaveBalance.personal} days`,
      400,
    );
  }

  if (leaveType === "annual") {
    employee.leaveBalance.annual -= days;
  } else if (leaveType === "sick") {
    employee.leaveBalance.sick -= days;
  } else if (leaveType === "personal") {
    employee.leaveBalance.personal -= days;
  }
  employee.leaveBalance.used += days;

  employee.status = "on_leave";

  employee.currentLeave = {
    leaveType: leaveType || "annual",
    startDate: start,
    endDate: end,
    totalDays: days,
    reason: reason || "",
    approvedBy: req.user._id,
    approvedAt: new Date(),
  };

  await employee.save();

  const updatedEmployee = await Employee.findById(employee._id).populate(
    "user",
    "firstName lastName email",
  );

  res.status(200).json({
    success: true,
    message: `Employee marked as on leave for ${days} days`,
    data: updatedEmployee,
  });
});

export const returnFromLeave = asyncHandler(async (req, res) => {
  const employee = await Employee.findOne({
    _id: req.params.id,
    workspace: req.workspace._id,
    status: "on_leave",
  });

  if (!employee) {
    throw new AppError("Employee not found or not on leave", 404);
  }

  if (!employee.leaveHistory) {
    employee.leaveHistory = [];
  }

  if (employee.currentLeave) {
    employee.leaveHistory.push({
      ...employee.currentLeave,
      returnedAt: new Date(),
    });
  }

  employee.currentLeave = undefined;

  employee.status = "active";
  employee.attendance.status = "present";

  await employee.save();

  const updatedEmployee = await Employee.findById(employee._id).populate(
    "user",
    "firstName lastName email",
  );

  res.status(200).json({
    success: true,
    message: "Employee returned from leave",
    data: updatedEmployee,
  });
});

export const getLeaveHistory = asyncHandler(async (req, res) => {
  const employee = await Employee.findOne({
    _id: req.params.id,
    workspace: req.workspace._id,
  });

  if (!employee) {
    throw new AppError("Employee not found", 404);
  }

  res.status(200).json({
    success: true,
    data: {
      leaveBalance: employee.leaveBalance,
      currentLeave: employee.currentLeave || null,
      leaveHistory: employee.leaveHistory || [],
    },
  });
});

export const deleteEmployee = asyncHandler(async (req, res) => {
  const employee = await Employee.findOne({
    _id: req.params.id,
    workspace: req.workspace._id,
  });

  if (!employee) {
    throw new AppError("Employee not found", 404);
  }

  const workspace = await Workspace.findById(req.workspace._id);
  if (
    workspace &&
    workspace.owner &&
    workspace.owner.toString() === employee.user.toString()
  ) {
    throw new AppError(
      "Cannot delete the workspace owner. Transfer ownership first.",
      400,
    );
  }

  const userId = employee.user;

  if (employee.department?.name) {
    await Department.findOneAndUpdate(
      { workspace: req.workspace._id, name: employee.department.name },
      { $pull: { employees: userId } },
    );
  }

  await Project.updateMany(
    { workspace: req.workspace._id, "team.user": userId },
    { $pull: { team: { user: userId } } },
  );

  await Task.updateMany(
    { workspace: req.workspace._id, "assignedTo.user": userId },
    { $pull: { assignedTo: { user: userId } } },
  );

  await Task.updateMany(
    { workspace: req.workspace._id },
    { $pull: { watchers: userId } },
  );

  await Employee.findByIdAndDelete(employee._id);

  const user = await User.findByIdAndDelete(userId);

  if (workspace) {
    workspace.admins = workspace.admins.filter(
      (admin) => admin.toString() !== userId.toString(),
    );
    await workspace.save();
  }

  res.status(200).json({
    success: true,
    message: `Employee ${user?.firstName || ""} ${user?.lastName || ""} has been permanently deleted.`,
    data: {
      deletedEmployeeId: employee._id,
      deletedUserId: userId,
    },
  });
});

export const updateAttendance = asyncHandler(async (req, res) => {
  const { status, checkIn, checkOut } = req.body;

  const employee = await Employee.findOne({
    _id: req.params.id,
    workspace: req.workspace._id,
  });

  if (!employee) {
    throw new AppError("Employee not found", 404);
  }

  if (!employee.attendance) {
    employee.attendance = {
      status: "present",
      lastCheckIn: null,
      lastCheckOut: null,
      totalHoursToday: 0,
    };
  }

  if (status) {
    employee.attendance.status = status;
  }
  if (checkIn) {
    employee.attendance.lastCheckIn = new Date(checkIn);
  }
  if (checkOut) {
    employee.attendance.lastCheckOut = new Date(checkOut);
    if (employee.attendance.lastCheckIn) {
      const hours =
        (new Date(checkOut) - new Date(employee.attendance.lastCheckIn)) /
        (1000 * 60 * 60);
      employee.attendance.totalHoursToday = Math.round(hours * 10) / 10;
    }
  }

  await employee.save();

  res.status(200).json({
    success: true,
    message: "Attendance updated",
    data: employee.attendance,
  });
});

export const getDepartments = asyncHandler(async (req, res) => {
  const departments = await Department.find({
    workspace: req.workspace._id,
    isActive: true,
  })
    .populate("manager", "firstName lastName email avatar")
    .populate("employees", "firstName lastName email avatar role")
    .sort("name");

  res.status(200).json({
    success: true,
    count: departments.length,
    data: departments,
  });
});

export const createDepartment = asyncHandler(async (req, res) => {
  const { name, code, description, managerId, budget } = req.body;

  const existing = await Department.findOne({
    workspace: req.workspace._id,
    name: { $regex: new RegExp(`^${name}$`, "i") },
  });

  if (existing) {
    throw new AppError("A department with this name already exists", 400);
  }

  const department = await Department.create({
    workspace: req.workspace._id,
    name,
    code: code || name.substring(0, 3).toUpperCase(),
    description,
    manager: managerId,
    budget: budget || { allocated: 0, spent: 0, currency: "USD" },
  });

  res.status(201).json({
    success: true,
    message: "Department created successfully",
    data: department,
  });
});

export const updateDepartment = asyncHandler(async (req, res) => {
  const department = await Department.findOneAndUpdate(
    { _id: req.params.id, workspace: req.workspace._id },
    req.body,
    { new: true, runValidators: true },
  ).populate("manager", "firstName lastName email");

  if (!department) {
    throw new AppError("Department not found", 404);
  }

  res.status(200).json({
    success: true,
    message: "Department updated",
    data: department,
  });
});

export const deleteDepartment = asyncHandler(async (req, res) => {
  const department = await Department.findOneAndUpdate(
    { _id: req.params.id, workspace: req.workspace._id },
    { isActive: false },
    { new: true },
  );

  if (!department) {
    throw new AppError("Department not found", 404);
  }

  await Employee.updateMany(
    { "department.name": department.name, workspace: req.workspace._id },
    { $unset: { department: "" } },
  );

  res.status(200).json({
    success: true,
    message: "Department deleted successfully",
  });
});
