import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';

interface Invoice {
  id: string;
  student_id: number;
  student_name?: string;
  student_email?: string;
  course_id?: number;
  course_name?: string;
  amount: number;
  due_date: string;
  issue_date: string;
  status: 'Paid' | 'Pending' | 'Overdue' | 'Partial' | 'Cancelled';
  payment_method?: string;
  payment_date?: string;
  paid_amount?: number;
  created_at?: string;
  updated_at?: string;
}

export async function generateInvoicePDF(invoice: Invoice): Promise<void> {
  try {
    // Create a temporary container for PDF generation
    const pdfContainer = document.createElement('div');
    pdfContainer.style.width = '210mm'; // A4 width
    pdfContainer.style.padding = '20mm';
    pdfContainer.style.backgroundColor = '#ffffff';
    pdfContainer.style.fontFamily = 'Arial, sans-serif';
    pdfContainer.style.position = 'absolute';
    pdfContainer.style.left = '-9999px';
    pdfContainer.style.top = '0';
    document.body.appendChild(pdfContainer);

    // Create invoice HTML content
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(amount);
    };

    const getStatusBadge = (status: string) => {
      const statusColors: Record<string, string> = {
        Paid: '#10b981',
        Pending: '#6b7280',
        Overdue: '#ef4444',
        Partial: '#f59e0b',
        Cancelled: '#9ca3af',
      };
      return statusColors[status] || '#6b7280';
    };

    // Logo and header section
    const logoSection = document.createElement('div');
    logoSection.style.display = 'flex';
    logoSection.style.justifyContent = 'space-between';
    logoSection.style.alignItems = 'center';
    logoSection.style.marginBottom = '30px';
    logoSection.style.paddingBottom = '20px';
    logoSection.style.borderBottom = '2px solid #e5e7eb';

    const logoContainer = document.createElement('div');
    logoContainer.style.display = 'flex';
    logoContainer.style.alignItems = 'center';
    logoContainer.style.gap = '15px';

    const logoImg = document.createElement('img');
    logoImg.src = '/images/etia-logo.png';
    logoImg.alt = 'ETIA Logo';
    logoImg.style.height = '60px';
    logoImg.style.width = 'auto';
    logoImg.crossOrigin = 'anonymous';

    const logoText = document.createElement('div');
    logoText.innerHTML = `
      <h1 style="margin: 0; font-size: 24px; font-weight: bold; color: #1f2937;">ETIA</h1>
      <p style="margin: 0; font-size: 14px; color: #6b7280;">Education Technology & Innovation Academy</p>
    `;

    logoContainer.appendChild(logoImg);
    logoContainer.appendChild(logoText);

    const invoiceHeader = document.createElement('div');
    invoiceHeader.style.textAlign = 'right';
    invoiceHeader.innerHTML = `
      <h2 style="margin: 0; font-size: 20px; font-weight: bold; color: #1f2937;">INVOICE</h2>
      <p style="margin: 5px 0 0 0; font-size: 12px; color: #6b7280;">#${invoice.id}</p>
    `;

    logoSection.appendChild(logoContainer);
    logoSection.appendChild(invoiceHeader);

    // Invoice content
    const invoiceContent = document.createElement('div');
    invoiceContent.style.padding = '20px';
    invoiceContent.style.backgroundColor = '#f9fafb';
    invoiceContent.style.borderRadius = '8px';
    invoiceContent.style.marginBottom = '20px';

    // Invoice header info
    const headerInfo = document.createElement('div');
    headerInfo.style.display = 'flex';
    headerInfo.style.justifyContent = 'space-between';
    headerInfo.style.marginBottom = '30px';
    headerInfo.style.padding = '15px';
    headerInfo.style.backgroundColor = '#ffffff';
    headerInfo.style.borderRadius = '6px';
    headerInfo.innerHTML = `
      <div>
        <p style="margin: 0 0 5px 0; font-size: 12px; color: #6b7280;">Invoice Number</p>
        <p style="margin: 0; font-size: 18px; font-weight: bold; color: #1f2937;">${invoice.id}</p>
      </div>
      <div style="text-align: right;">
        <p style="margin: 0 0 5px 0; font-size: 12px; color: #6b7280;">Status</p>
        <span style="display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; background-color: ${getStatusBadge(invoice.status)}; color: white;">${invoice.status}</span>
      </div>
    `;

    // Student and course info
    const infoSection = document.createElement('div');
    infoSection.style.display = 'grid';
    infoSection.style.gridTemplateColumns = '1fr 1fr';
    infoSection.style.gap = '20px';
    infoSection.style.marginBottom = '30px';
    infoSection.innerHTML = `
      <div style="padding: 15px; background-color: #ffffff; border-radius: 6px;">
        <h3 style="margin: 0 0 15px 0; font-size: 16px; font-weight: 600; color: #1f2937;">Student Information</h3>
        <p style="margin: 0 0 5px 0; font-size: 14px; font-weight: 600; color: #1f2937;">${invoice.student_name || 'Unknown Student'}</p>
        <p style="margin: 0 0 5px 0; font-size: 12px; color: #6b7280;">ID: ${invoice.student_id}</p>
        ${invoice.student_email ? `<p style="margin: 0; font-size: 12px; color: #6b7280;">${invoice.student_email}</p>` : ''}
      </div>
      <div style="padding: 15px; background-color: #ffffff; border-radius: 6px;">
        <h3 style="margin: 0 0 15px 0; font-size: 16px; font-weight: 600; color: #1f2937;">Course Information</h3>
        <p style="margin: 0 0 5px 0; font-size: 14px; font-weight: 600; color: #1f2937;">${invoice.course_name || 'N/A'}</p>
        ${invoice.course_id ? `<p style="margin: 0; font-size: 12px; color: #6b7280;">Course ID: ${invoice.course_id}</p>` : ''}
      </div>
    `;

    // Payment details
    const paymentSection = document.createElement('div');
    paymentSection.style.padding = '15px';
    paymentSection.style.backgroundColor = '#ffffff';
    paymentSection.style.borderRadius = '6px';
    paymentSection.style.marginBottom = '20px';
    paymentSection.innerHTML = `
      <h3 style="margin: 0 0 15px 0; font-size: 16px; font-weight: 600; color: #1f2937;">Payment Details</h3>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
        <div>
          <p style="margin: 0 0 5px 0; font-size: 12px; color: #6b7280;">Total Amount</p>
          <p style="margin: 0; font-size: 24px; font-weight: bold; color: #1f2937;">${formatCurrency(invoice.amount || 0)}</p>
        </div>
        ${invoice.paid_amount !== undefined && invoice.paid_amount > 0 ? `
          <div>
            <p style="margin: 0 0 5px 0; font-size: 12px; color: #6b7280;">Paid Amount</p>
            <p style="margin: 0; font-size: 20px; font-weight: 600; color: #10b981;">${formatCurrency(invoice.paid_amount)}</p>
          </div>
        ` : ''}
      </div>
    `;

    // Dates section
    const datesSection = document.createElement('div');
    datesSection.style.display = 'grid';
    datesSection.style.gridTemplateColumns = '1fr 1fr 1fr';
    datesSection.style.gap = '15px';
    datesSection.style.padding = '15px';
    datesSection.style.backgroundColor = '#ffffff';
    datesSection.style.borderRadius = '6px';
    datesSection.innerHTML = `
      <div>
        <p style="margin: 0 0 5px 0; font-size: 12px; color: #6b7280;">Issue Date</p>
        <p style="margin: 0; font-size: 14px; font-weight: 600; color: #1f2937;">${new Date(invoice.issue_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>
      <div>
        <p style="margin: 0 0 5px 0; font-size: 12px; color: #6b7280;">Payment Date</p>
        <p style="margin: 0; font-size: 14px; font-weight: 600; color: #1f2937;">${new Date(invoice.due_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>
      ${invoice.payment_method ? `
        <div>
          <p style="margin: 0 0 5px 0; font-size: 12px; color: #6b7280;">Payment Method</p>
          <p style="margin: 0; font-size: 14px; font-weight: 600; color: #1f2937;">${invoice.payment_method}</p>
        </div>
      ` : ''}
    `;

    invoiceContent.appendChild(headerInfo);
    invoiceContent.appendChild(infoSection);
    invoiceContent.appendChild(paymentSection);

    pdfContainer.appendChild(logoSection);
    pdfContainer.appendChild(invoiceContent);

    // Wait for logo to load
    await new Promise(resolve => setTimeout(resolve, 500));

    // Generate canvas from the container using html2canvas-pro
    const canvas = await html2canvas(pdfContainer, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    // Clean up
    document.body.removeChild(pdfContainer);

    // Create PDF
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
    const imgScaledWidth = imgWidth * ratio;
    const imgScaledHeight = imgHeight * ratio;
    const xOffset = (pdfWidth - imgScaledWidth) / 2;
    const yOffset = 0;

    // If content is taller than one page, split it
    if (imgScaledHeight > pdfHeight) {
      let heightLeft = imgScaledHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', xOffset, position, imgScaledWidth, imgScaledHeight);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgScaledHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', xOffset, position, imgScaledWidth, imgScaledHeight);
        heightLeft -= pdfHeight;
      }
    } else {
      pdf.addImage(imgData, 'PNG', xOffset, yOffset, imgScaledWidth, imgScaledHeight);
    }

    // Save PDF
    const invoiceDate = new Date(invoice.issue_date).toISOString().split('T')[0];
    pdf.save(`Invoice-${invoice.id}-${invoiceDate}.pdf`);
  } catch (error) {
    console.error('Error generating PDF:', error);
    alert('Failed to generate PDF. Please try again.');
    throw error;
  }
}

