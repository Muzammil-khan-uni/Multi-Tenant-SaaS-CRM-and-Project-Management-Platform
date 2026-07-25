import express from 'express';
import {
  getEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  terminateEmployee,
  reactivateEmployee,
  markOnLeave,
  returnFromLeave,
  getLeaveHistory,
  updateAttendance,
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from '../controllers/employeeController.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';

const router = express.Router();

router.use(authenticate);

// Employee CRUD
router.route('/')
  .get(requirePermission('view_users'), getEmployees)
  .post(requirePermission('create_users'), createEmployee);

router.route('/:id')
  .get(requirePermission('view_users'), getEmployee)
  .put(requirePermission('update_users'), updateEmployee)
  .delete(requirePermission('delete_users'), deleteEmployee);

// Attendance
router.put('/:id/attendance', updateAttendance);

// Terminate & Reactivate
router.put('/:id/terminate', requirePermission('delete_users'), terminateEmployee);
router.put('/:id/reactivate', requirePermission('update_users'), reactivateEmployee);

// Leave Management
router.put('/:id/leave', markOnLeave);
router.put('/:id/return-from-leave', returnFromLeave);
router.get('/:id/leave-history', getLeaveHistory);

// Department CRUD
router.route('/departments')
  .get(getDepartments)
  .post(requirePermission('manage_users'), createDepartment);

router.route('/departments/:id')
  .put(requirePermission('manage_users'), updateDepartment)
  .delete(requirePermission('manage_users'), deleteDepartment);

export default router;