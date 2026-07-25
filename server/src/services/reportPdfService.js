import PDFDocument from 'pdfkit';

export const generateReportPDF = (type, data, res) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
      doc.pipe(res);

      const primaryColor = '#2563eb';
      const darkColor = '#1e293b';
      const grayColor = '#64748b';
      const lightGray = '#f8fafc';

      // Header
      doc.rect(0, 0, doc.page.width, 4).fill(primaryColor);
      
      const titles = {
        'employee-performance': 'Employee Performance Report',
        'project-progress': 'Project Progress Report',
        'task-completion': 'Task Completion Report',
        'revenue': 'Revenue Summary Report',
      };

      doc.fontSize(22).font('Helvetica-Bold').fillColor(darkColor)
        .text(titles[type] || 'Report', 40, 25);
      doc.fontSize(10).font('Helvetica').fillColor(grayColor)
        .text(`Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 40, 52);

      let y = 80;

      if (type === 'employee-performance' && Array.isArray(data)) {
        // Table Header
        doc.rect(40, y, 515, 22).fill(darkColor);
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff');
        doc.text('Employee', 50, y + 7);
        doc.text('Tasks', 200, y + 7, { width: 80, align: 'center' });
        doc.text('Completed', 280, y + 7, { width: 80, align: 'center' });
        doc.text('Rate', 370, y + 7, { width: 60, align: 'center' });
        doc.text('Overdue', 440, y + 7, { width: 60, align: 'center' });
        doc.text('Hours', 500, y + 7, { width: 45, align: 'right' });
        y += 22;

        data.forEach((emp, i) => {
          if (y > doc.page.height - 100) { doc.addPage(); y = 40; }
          if (i % 2 === 0) doc.rect(40, y, 515, 18).fill(lightGray);
          doc.fontSize(8).font('Helvetica').fillColor(darkColor);
          doc.text(emp.name, 50, y + 5, { width: 140 });
          doc.text(String(emp.totalTasks || 0), 200, y + 5, { width: 80, align: 'center' });
          doc.text(String(emp.completedTasks || 0), 280, y + 5, { width: 80, align: 'center' });
          doc.text(`${emp.completionRate || 0}%`, 370, y + 5, { width: 60, align: 'center' });
          doc.text(String(emp.overdueTasks || 0), 440, y + 5, { width: 60, align: 'center' });
          doc.text(`${emp.totalHours || 0}h`, 500, y + 5, { width: 45, align: 'right' });
          y += 18;
        });
      }

      if (type === 'project-progress' && Array.isArray(data)) {
        doc.rect(40, y, 515, 22).fill(darkColor);
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff');
        doc.text('Project', 50, y + 7);
        doc.text('Status', 220, y + 7, { width: 70, align: 'center' });
        doc.text('Progress', 300, y + 7, { width: 70, align: 'center' });
        doc.text('Tasks', 380, y + 7, { width: 80, align: 'center' });
        doc.text('Budget', 460, y + 7, { width: 85, align: 'right' });
        y += 22;

        data.forEach((proj, i) => {
          if (y > doc.page.height - 100) { doc.addPage(); y = 40; }
          if (i % 2 === 0) doc.rect(40, y, 515, 18).fill(lightGray);
          doc.fontSize(8).font('Helvetica').fillColor(darkColor);
          doc.text(proj.name, 50, y + 5, { width: 160 });
          doc.text(proj.status, 220, y + 5, { width: 70, align: 'center' });
          doc.text(`${proj.progress || 0}%`, 300, y + 5, { width: 70, align: 'center' });
          doc.text(`${proj.completedTasks || 0}/${proj.totalTasks || 0}`, 380, y + 5, { width: 80, align: 'center' });
          doc.text(`${proj.budgetUtilization || 0}%`, 460, y + 5, { width: 85, align: 'right' });
          y += 18;
        });
      }

   if (type === 'task-completion' && data) {
  // Summary Section
  doc.fontSize(14).font('Helvetica-Bold').fillColor(primaryColor)
    .text('Task Completion Summary', 40, y);
  y += 25;

  // Summary boxes
  const boxWidth = 150;
  const boxGap = 15;
  
  // Total Tasks
  doc.roundedRect(40, y, boxWidth, 50, 4).fill(lightGray).stroke('#e2e8f0');
  doc.fontSize(9).font('Helvetica').fillColor(grayColor).text('Total Tasks', 55, y + 8);
  doc.fontSize(18).font('Helvetica-Bold').fillColor(darkColor).text(String(data.totalTasks || 0), 55, y + 22);
  
  // Completed Tasks
  doc.roundedRect(40 + boxWidth + boxGap, y, boxWidth, 50, 4).fill(lightGray).stroke('#e2e8f0');
  doc.fontSize(9).font('Helvetica').fillColor(grayColor).text('Completed', 55 + boxWidth + boxGap, y + 8);
  doc.fontSize(18).font('Helvetica-Bold').fillColor('#059669').text(String(data.totalCompletedTasks || 0), 55 + boxWidth + boxGap, y + 22);
  
  // Completion Rate
  doc.roundedRect(40 + (boxWidth + boxGap) * 2, y, boxWidth, 50, 4).fill(lightGray).stroke('#e2e8f0');
  doc.fontSize(9).font('Helvetica').fillColor(grayColor).text('Rate', 55 + (boxWidth + boxGap) * 2, y + 8);
  const rate = data.totalTasks > 0 ? Math.round((data.totalCompletedTasks / data.totalTasks) * 100) : 0;
  doc.fontSize(18).font('Helvetica-Bold').fillColor(primaryColor).text(`${rate}%`, 55 + (boxWidth + boxGap) * 2, y + 22);

  y += 70;

  // Priority Distribution
  doc.fontSize(12).font('Helvetica-Bold').fillColor(darkColor).text('Priority Distribution', 40, y);
  y += 22;
  
  if (data.byPriority?.length > 0) {
    doc.rect(40, y, 515, 20).fill(darkColor);
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff');
    doc.text('Priority', 50, y + 6);
    doc.text('Count', 250, y + 6, { width: 100, align: 'center' });
    doc.text('Percentage', 400, y + 6, { width: 145, align: 'right' });
    y += 20;

    const totalPriority = data.byPriority.reduce((sum, p) => sum + p.count, 0);
    data.byPriority.forEach((p, i) => {
      if (y > doc.page.height - 100) { doc.addPage(); y = 40; }
      if (i % 2 === 0) doc.rect(40, y, 515, 18).fill(lightGray);
      doc.fontSize(8).font('Helvetica').fillColor(darkColor);
      doc.text(p._id || 'Unknown', 50, y + 5);
      doc.text(String(p.count || 0), 250, y + 5, { width: 100, align: 'center' });
      const pct = totalPriority > 0 ? Math.round((p.count / totalPriority) * 100) : 0;
      doc.text(`${pct}%`, 400, y + 5, { width: 145, align: 'right' });
      y += 18;
    });
  }

  y += 15;

  // Top Projects
  doc.fontSize(12).font('Helvetica-Bold').fillColor(darkColor).text('Top Projects by Completions', 40, y);
  y += 22;

  if (data.byProject?.length > 0) {
    doc.rect(40, y, 515, 20).fill(darkColor);
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff');
    doc.text('#', 50, y + 6);
    doc.text('Project', 80, y + 6);
    doc.text('Completions', 400, y + 6, { width: 145, align: 'right' });
    y += 20;

    data.byProject.slice(0, 10).forEach((p, i) => {
      if (y > doc.page.height - 100) { doc.addPage(); y = 40; }
      if (i % 2 === 0) doc.rect(40, y, 515, 18).fill(lightGray);
      doc.fontSize(8).font('Helvetica').fillColor(darkColor);
      doc.text(String(i + 1), 50, y + 5);
      doc.text(p.projectName || 'Unknown', 80, y + 5, { width: 300 });
      doc.text(String(p.count || 0), 400, y + 5, { width: 145, align: 'right' });
      y += 18;
    });
  }

  y += 15;

  // Average Completion Time
  doc.fontSize(12).font('Helvetica-Bold').fillColor(darkColor)
    .text(`Average Completion Time: ${data.avgCompletionHours || 0} hours`, 40, y);
}

      if (type === 'revenue' && data) {
        doc.fontSize(14).font('Helvetica-Bold').fillColor(primaryColor)
          .text(`Total Revenue: $${(data.totalRevenue || 0).toLocaleString()}`, 40, y);
        y += 25;
        doc.fontSize(11).font('Helvetica').fillColor(darkColor)
          .text(`Average Invoice: $${(data.averageInvoice || 0).toLocaleString()}`, 40, y);
        y += 18;
        doc.fontSize(11).font('Helvetica').fillColor(darkColor)
          .text(`Total Invoices: ${data.totalInvoices || 0}`, 40, y);
        y += 18;
        doc.fontSize(11).font('Helvetica').fillColor(darkColor)
          .text(`Monthly Growth: ${data.monthlyGrowth || 0}%`, 40, y);
        y += 30;

        if (data.byClient?.length > 0) {
          doc.fontSize(12).font('Helvetica-Bold').fillColor(darkColor).text('Revenue by Client', 40, y);
          y += 22;
          data.byClient.forEach((c, i) => {
            doc.fontSize(9).font('Helvetica').fillColor(darkColor);
            doc.text(`${i + 1}. ${c.clientName}`, 50, y);
            doc.text(`$${(c.total || 0).toLocaleString()} (${c.count} invoices)`, 300, y);
            y += 16;
          });
        }
      }

      // Footer
      const footerY = doc.page.height - 30;
      doc.rect(0, footerY, doc.page.width, 0.5).fill(grayColor);
      doc.fontSize(7).font('Helvetica').fillColor(grayColor)
        .text('Generated by SaaS CRM Platform', 40, footerY + 8, { align: 'center', width: doc.page.width - 80 });

      doc.end();
      resolve();
    } catch (error) {
      reject(error);
    }
  });
};