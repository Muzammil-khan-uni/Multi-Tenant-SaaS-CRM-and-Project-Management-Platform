import express from 'express';
import {
  getChatMessages,
  sendChatMessage,
  deleteChatMessage,
  clearChatMessages,
  addReaction,
  editChatMessage,
} from '../controllers/chatController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/:roomId', getChatMessages);
router.post('/:roomId', sendChatMessage);
router.put('/:messageId', editChatMessage);
router.delete('/:messageId', deleteChatMessage);
router.delete('/:roomId/clear', clearChatMessages);
router.post('/:messageId/reaction', addReaction);

export default router;