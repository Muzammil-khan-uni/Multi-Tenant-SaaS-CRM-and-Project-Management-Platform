import Invoice from '../models/Invoice.js';

export const markOverdueInvoices = async () => {
  try {
    const result = await Invoice.updateMany(
      {
        status: { $in: ['sent'] },
        dueDate: { $lt: new Date() },
      },
      {
        $set: { status: 'overdue' },
        $push: {
          activityLog: {
            action: 'status_changed',
            description: 'Invoice automatically marked as overdue',
            performedBy: null,
            timestamp: new Date(),
          },
        },
      }
    );

    if (result.modifiedCount > 0) {
      console.log(`Marked ${result.modifiedCount} invoices as overdue`);
    }
  } catch (error) {
    console.error('Failed to mark overdue invoices:', error);
  }
};

// Run every hour — started explicitly after DB connects (see index.js)
export const startInvoiceScheduler = () => {
  markOverdueInvoices(); // first run now that DB is ready
  setInterval(markOverdueInvoices, 60 * 60 * 1000);
};