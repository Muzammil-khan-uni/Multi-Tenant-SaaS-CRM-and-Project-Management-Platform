import express from 'express';
import {
  getClients, getClientById, createClient,
  updateClient, deleteClient,
  addContact, updateContact, deleteContact,
  addNote, deleteNote,
} from '../controllers/clientController.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';

const router = express.Router();

router.use(authenticate);

// Client CRUD
router.route('/')
  .get(requirePermission('view_clients'), getClients)
  .post(requirePermission('create_clients'), createClient);

router.route('/:id')
  .get(requirePermission('view_clients'), getClientById)
  .put(requirePermission('update_clients'), updateClient)
  .delete(requirePermission('delete_clients'), deleteClient);

// Contacts
router.post('/:id/contacts', requirePermission('update_clients'), addContact);
router.put('/:id/contacts/:contactId', requirePermission('update_clients'), updateContact);
router.delete('/:id/contacts/:contactId', requirePermission('update_clients'), deleteContact);

// Notes
router.post('/:id/notes', requirePermission('update_clients'), addNote);
router.delete('/:id/notes/:noteId', requirePermission('update_clients'), deleteNote);

export default router;