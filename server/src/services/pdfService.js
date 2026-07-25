import PDFDocument from "pdfkit";

const getCurrencySymbol = (code) => {
  const symbols = { USD: "$", EUR: "€", GBP: "£", PKR: "₨" };
  return symbols[code] || code || "$";
};

export const generateInvoicePDF = (invoice, res) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margin: 40,
        bufferPages: true,
      });

      doc.pipe(res);

      const client = invoice.client;
      const currencySymbol = getCurrencySymbol(invoice.currency);
      const pageWidth = doc.page.width - 80; // Usable width after margins
      const leftMargin = 40;
      const rightMargin = doc.page.width - 40;

      const primaryColor = "#2563eb";
      const darkColor = "#1e293b";
      const grayColor = "#64748b";
      const lightGray = "#f8fafc";
      const borderColor = "#e2e8f0";
      const successColor = "#059669";
      const dangerColor = "#dc2626";

      // ===== TOP HEADER BAR =====
      doc.rect(0, 0, doc.page.width, 6).fill(primaryColor);

      // ===== COMPANY NAME & INVOICE TITLE =====
      let y = 25;
      doc
        .fontSize(26)
        .font("Helvetica-Bold")
        .fillColor(darkColor)
        .text("INVOICE", leftMargin, y);

      // Invoice Number
      doc
        .fontSize(10)
        .font("Helvetica")
        .fillColor(grayColor)
        .text(`Invoice #: ${invoice.number}`, leftMargin, y + 35);

      // Status Badge
      const statusConfig = {
        draft: { bg: "#f1f5f9", text: "#475569", border: "#cbd5e1" },
        sent: { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
        paid: { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" },
        overdue: { bg: "#fef2f2", text: "#b91c1c", border: "#fecaca" },
        cancelled: { bg: "#fef2f2", text: "#b91c1c", border: "#fecaca" },
      };
      const sc = statusConfig[invoice.status] || statusConfig.draft;

      doc
        .roundedRect(leftMargin, y + 55, 85, 20, 4)
        .fill(sc.bg)
        .stroke(sc.border);
      doc
        .fontSize(8)
        .font("Helvetica-Bold")
        .fillColor(sc.text)
        .text(invoice.status.toUpperCase(), leftMargin, y + 60, {
          width: 85,
          align: "center",
        });

      // Dates on right side
      const dateX = rightMargin - 180;
      doc
        .fontSize(9)
        .font("Helvetica")
        .fillColor(grayColor)
        .text("Issue Date", dateX, y + 5, { width: 170, align: "right" });
      doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .fillColor(darkColor)
        .text(
          new Date(invoice.issueDate).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
          dateX,
          y + 20,
          { width: 170, align: "right" },
        );

      doc
        .fontSize(9)
        .font("Helvetica")
        .fillColor(grayColor)
        .text("Due Date", dateX, y + 45, { width: 170, align: "right" });
      doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .fillColor(invoice.status === "overdue" ? dangerColor : darkColor)
        .text(
          new Date(invoice.dueDate).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
          dateX,
          y + 60,
          { width: 170, align: "right" },
        );

      // ===== BILL TO SECTION =====
      y = 115;
      const billToWidth = pageWidth / 2 - 10;

      // Bill To Box
      doc.roundedRect(leftMargin, y, billToWidth, 90, 4).stroke(borderColor);
      doc.rect(leftMargin, y, billToWidth, 22).fill(darkColor);
      doc
        .fontSize(9)
        .font("Helvetica-Bold")
        .fillColor("#ffffff")
        .text("BILL TO", leftMargin + 10, y + 6);

      let billY = y + 30;
      doc
        .fontSize(11)
        .font("Helvetica-Bold")
        .fillColor(darkColor)
        .text(client?.company?.name || "N/A", leftMargin + 10, billY, {
          width: billToWidth - 20,
        });

      if (client?.contacts?.[0]?.email) {
        billY += 18;
        doc
          .fontSize(8)
          .font("Helvetica")
          .fillColor(grayColor)
          .text(client.contacts[0].email, leftMargin + 10, billY, {
            width: billToWidth - 20,
          });
      }
      if (client?.address?.city) {
        billY += 18;
        const addr = `${client.address.city}${client.address.state ? ", " + client.address.state : ""} ${client.address.zipCode || ""}`;
        doc
          .fontSize(8)
          .font("Helvetica")
          .fillColor(grayColor)
          .text(addr, leftMargin + 10, billY, { width: billToWidth - 20 });
      }

      // Payment Info Box
      const payX = leftMargin + billToWidth + 20;
      doc.roundedRect(payX, y, billToWidth, 90, 4).stroke(borderColor);
      doc.rect(payX, y, billToWidth, 22).fill(primaryColor);
      doc
        .fontSize(9)
        .font("Helvetica-Bold")
        .fillColor("#ffffff")
        .text("PAYMENT DETAILS", payX + 10, y + 6);

      doc.fontSize(8).font("Helvetica").fillColor(grayColor);
      doc.text("Payment Terms:", payX + 10, y + 32);
      doc
        .font("Helvetica-Bold")
        .fillColor(darkColor)
        .text(invoice.paymentTerms || "N/A", payX + 110, y + 32);

      doc.font("Helvetica").fillColor(grayColor);
      doc.text("Currency:", payX + 10, y + 50);
      doc
        .font("Helvetica-Bold")
        .fillColor(darkColor)
        .text(invoice.currency, payX + 110, y + 50);

      doc.font("Helvetica").fillColor(grayColor);
      doc.text("Type:", payX + 10, y + 68);
      doc
        .font("Helvetica-Bold")
        .fillColor(darkColor)
        .text(
          invoice.type?.replace("_", " ").toUpperCase() || "ONE TIME",
          payX + 110,
          y + 68,
        );

      // ===== ITEMS TABLE =====
      y = 225;
      const colWidths = [30, pageWidth - 30 - 70 - 90 - 90, 70, 90, 90];
      const colX = [
        leftMargin,
        leftMargin + 30,
        leftMargin + 30 + colWidths[1],
        leftMargin + 30 + colWidths[1] + 70,
        leftMargin + 30 + colWidths[1] + 70 + 90,
      ];

      // Table Header
      doc.rect(leftMargin, y, pageWidth, 24).fill(darkColor);
      doc.fontSize(8).font("Helvetica-Bold").fillColor("#ffffff");
      doc.text("#", colX[0] + 8, y + 7);
      doc.text("DESCRIPTION", colX[1] + 8, y + 7);
      doc.text("QTY", colX[2], y + 7, { width: 60, align: "center" });
      doc.text("UNIT PRICE", colX[3], y + 7, { width: 80, align: "right" });
      doc.text("AMOUNT", colX[4], y + 7, { width: 80, align: "right" });

      // Table Rows
      let rowY = y + 24;
      invoice.items.forEach((item, index) => {
        // Check if we need a new page
        if (rowY > doc.page.height - 200) {
          doc.addPage();
          rowY = 40;

          // Repeat header on new page
          doc.rect(leftMargin, rowY, pageWidth, 24).fill(darkColor);
          doc.fontSize(8).font("Helvetica-Bold").fillColor("#ffffff");
          doc.text("#", colX[0] + 8, rowY + 7);
          doc.text("DESCRIPTION", colX[1] + 8, rowY + 7);
          doc.text("QTY", colX[2], rowY + 7, { width: 60, align: "center" });
          doc.text("UNIT PRICE", colX[3], rowY + 7, {
            width: 80,
            align: "right",
          });
          doc.text("AMOUNT", colX[4], rowY + 7, { width: 80, align: "right" });
          rowY += 24;
        }

        // Alternate row background
        if (index % 2 === 0) {
          doc.rect(leftMargin, rowY, pageWidth, 22).fill(lightGray);
        }

        doc.fontSize(8).font("Helvetica").fillColor(darkColor);
        doc.text(String(index + 1), colX[0] + 8, rowY + 6);
        doc.text(item.description || "—", colX[1] + 8, rowY + 6, {
          width: colWidths[1] - 16,
        });
        doc.text(String(item.quantity || 0), colX[2], rowY + 6, {
          width: 60,
          align: "center",
        });
        doc.text(
          `${currencySymbol}${(item.unitPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
          colX[3],
          rowY + 6,
          { width: 80, align: "right" },
        );
        doc
          .font("Helvetica-Bold")
          .text(
            `${currencySymbol}${((item.quantity || 0) * (item.unitPrice || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
            colX[4],
            rowY + 6,
            { width: 80, align: "right" },
          );

        rowY += 22;
      });

      // ===== TOTALS SECTION =====
      rowY += 15;
      const totalsX = rightMargin - 200;

      // Draw a line above totals
      doc.rect(totalsX - 10, rowY, 210, 0.5).fill(borderColor);
      rowY += 12;

      // Subtotal
      doc
        .fontSize(9)
        .font("Helvetica")
        .fillColor(grayColor)
        .text("Subtotal", totalsX, rowY);
      doc
        .fontSize(9)
        .font("Helvetica")
        .fillColor(darkColor)
        .text(
          `${currencySymbol}${(invoice.subtotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
          totalsX,
          rowY,
          { width: 200, align: "right" },
        );
      rowY += 18;

      // Discount
      if (invoice.discount > 0) {
        doc
          .fontSize(9)
          .font("Helvetica")
          .fillColor(grayColor)
          .text("Discount", totalsX, rowY);
        doc
          .font("Helvetica")
          .fillColor(dangerColor)
          .text(
            `-${currencySymbol}${invoice.discount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
            totalsX,
            rowY,
            { width: 200, align: "right" },
          );
        rowY += 18;
      }

      // Tax
      if (invoice.taxTotal > 0) {
        doc
          .fontSize(9)
          .font("Helvetica")
          .fillColor(grayColor)
          .text("Tax", totalsX, rowY);
        doc
          .font("Helvetica")
          .fillColor(darkColor)
          .text(
            `${currencySymbol}${invoice.taxTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
            totalsX,
            rowY,
            { width: 200, align: "right" },
          );
        rowY += 18;
      }

      // Total line
      doc.rect(totalsX - 10, rowY, 210, 1).fill(primaryColor);
      rowY += 10;

      // Total
      doc
        .fontSize(12)
        .font("Helvetica-Bold")
        .fillColor(darkColor)
        .text("TOTAL", totalsX, rowY);
      doc
        .fontSize(13)
        .font("Helvetica-Bold")
        .fillColor(primaryColor)
        .text(
          `${currencySymbol}${(invoice.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
          totalsX,
          rowY,
          { width: 200, align: "right" },
        );
      rowY += 24;

      // Amount Paid
      doc
        .fontSize(9)
        .font("Helvetica")
        .fillColor(grayColor)
        .text("Amount Paid", totalsX, rowY);
      doc
        .font("Helvetica")
        .fillColor(successColor)
        .text(
          `${currencySymbol}${(invoice.amountPaid || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
          totalsX,
          rowY,
          { width: 200, align: "right" },
        );
      rowY += 20;

      // Balance Due Box
      doc
        .roundedRect(totalsX - 10, rowY - 3, 210, 26, 3)
        .fill(invoice.balanceDue > 0 ? "#fef2f2" : "#f0fdf4");
      doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .fillColor(darkColor)
        .text("BALANCE DUE", totalsX, rowY + 4);
      doc
        .fontSize(12)
        .font("Helvetica-Bold")
        .fillColor(invoice.balanceDue > 0 ? dangerColor : successColor)
        .text(
          `${currencySymbol}${(invoice.balanceDue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
          totalsX,
          rowY + 4,
          { width: 200, align: "right" },
        );

      // ===== NOTES =====
      rowY += 45;
      if (invoice.notes) {
        doc
          .fontSize(8)
          .font("Helvetica-Bold")
          .fillColor(grayColor)
          .text("NOTES", leftMargin, rowY);
        rowY += 14;
        doc
          .fontSize(8)
          .font("Helvetica")
          .fillColor(darkColor)
          .text(invoice.notes, leftMargin, rowY, { width: pageWidth - 200 });
        rowY += 30;
      }

      // ===== TERMS =====
      if (invoice.termsAndConditions) {
        doc
          .fontSize(8)
          .font("Helvetica-Bold")
          .fillColor(grayColor)
          .text("TERMS & CONDITIONS", leftMargin, rowY);
        rowY += 14;
        doc
          .fontSize(8)
          .font("Helvetica")
          .fillColor(darkColor)
          .text(invoice.termsAndConditions, leftMargin, rowY, {
            width: pageWidth - 200,
          });
        rowY += 30;
      }

      // ===== PAYMENT HISTORY =====
      if (invoice.payments?.length > 0) {
        doc
          .fontSize(8)
          .font("Helvetica-Bold")
          .fillColor(grayColor)
          .text("PAYMENT HISTORY", leftMargin, rowY);
        rowY += 16;

        invoice.payments.forEach((payment) => {
          doc
            .fontSize(8)
            .font("Helvetica")
            .fillColor(darkColor)
            .text(
              `${new Date(payment.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
              leftMargin,
              rowY,
            );
          doc.text(
            `${payment.method?.replace("_", " ")}`,
            leftMargin + 120,
            rowY,
          );
          doc
            .font("Helvetica-Bold")
            .text(
              `${currencySymbol}${(payment.amount || 0).toLocaleString()}`,
              leftMargin + 220,
              rowY,
            );
          if (payment.transactionId) {
            doc
              .fontSize(7)
              .fillColor(grayColor)
              .text(`Ref: ${payment.transactionId}`, leftMargin + 320, rowY);
          }
          rowY += 15;
        });
      }

      // ===== FOOTER =====
      const footerY = doc.page.height - 40;
      doc.rect(0, footerY, doc.page.width, 0.5).fill(borderColor);
      doc
        .fontSize(7)
        .font("Helvetica")
        .fillColor(grayColor)
        .text("Thank you for your business!", leftMargin, footerY + 10, {
          align: "center",
          width: pageWidth,
        });
      doc.text(
        `Generated on ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })} at ${new Date().toLocaleTimeString()}`,
        leftMargin,
        footerY + 20,
        { align: "center", width: pageWidth },
      );

      doc.end();
      resolve();
    } catch (error) {
      reject(error);
    }
  });
};
