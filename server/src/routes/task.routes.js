import express from 'express';
import {
  getTasks, getTaskById, createTask, updateTask, deleteTask,
  assignTask, addComment, deleteComment,
  addChecklistItem, toggleChecklistItem, deleteChecklistItem,
  addAttachment, deleteAttachment, updateTaskBoard,
} from '../controllers/taskController.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';

const router = express.Router();
router.use(authenticate);

router.route('/')
  .get(requirePermission('view_tasks'), getTasks)
  .post(requirePermission('create_tasks'), createTask);

router.route('/:id')
  .get(requirePermission('view_tasks'), getTaskById)
  .put(requirePermission('update_tasks'), updateTask)
  .delete(requirePermission('delete_tasks'), deleteTask);

// Assign
router.post('/:id/assign', requirePermission('assign_tasks'), assignTask);

// Comments
router.post('/:id/comments', requirePermission('add_task_comments'), addComment);
router.delete('/:id/comments/:commentId', deleteComment);

// Checklist
router.post('/:id/checklist', requirePermission('update_tasks'), addChecklistItem);
router.put('/:id/checklist/:itemId', toggleChecklistItem);
router.delete('/:id/checklist/:itemId', deleteChecklistItem);

// Attachments
router.post('/:id/attachments', requirePermission('upload_files'), addAttachment);
router.delete('/:id/attachments/:attachmentId', deleteAttachment);

// Board position
router.put('/:id/board', updateTaskBoard);

export default router;