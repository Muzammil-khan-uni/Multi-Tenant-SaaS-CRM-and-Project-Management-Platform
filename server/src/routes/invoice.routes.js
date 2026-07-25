import express from "express";
import {
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  sendInvoice,
  getClientInvoices,
  recordPayment,
  getInvoiceStats,
  downloadInvoice,
  permanentlyDeleteInvoice,
  cancelInvoice,
} from "../controllers/invoiceController.js";
import { authenticate } from "../middleware/auth.js";
import { requirePermission } from "../middleware/rbac.js";

const router = express.Router();

router.use(authenticate);

router.get("/stats", getInvoiceStats);

router
  .route("/")
  .get(requirePermission("view_invoices"), getInvoices)
  .post(requirePermission("create_invoices"), createInvoice);

router.post("/:id/send", requirePermission("send_invoices"), sendInvoice);
router.get("/client/:clientId", getClientInvoices);
router.post(
  "/:id/payments",
  requirePermission("record_payments"),
  recordPayment,
);
router.get("/:id/download", downloadInvoice);
router.delete(
  "/:id/permanent",
  requirePermission("delete_invoices"),
  permanentlyDeleteInvoice,
);
router.put("/:id/cancel", requirePermission("delete_invoices"), cancelInvoice);

router
  .route("/:id")
  .get(getInvoiceById)
  .put(requirePermission("update_invoices"), updateInvoice);

export default router;
