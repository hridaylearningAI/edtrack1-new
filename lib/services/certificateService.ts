import jsPDF from 'jspdf';

export interface CertificateData {
  studentName: string;
  courseName: string;
  completionDate: string;
  certificateNumber: string;
  grade?: string;
}

/**
 * Generate a certificate PDF
 */
export async function generateCertificatePDF(data: CertificateData): Promise<Buffer> {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [297, 210], // A4 landscape
  });

  // Set up colors
  const primaryColor = '#667eea';
  const secondaryColor = '#764ba2';
  const textColor = '#333333';
  const lightGray = '#f5f5f5';

  // Background gradient effect (simulated with rectangles)
  doc.setFillColor(102, 126, 234); // #667eea
  doc.rect(0, 0, 297, 210, 'F');
  
  // White content area
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(20, 20, 257, 170, 5, 5, 'F');

  // Decorative border
  doc.setDrawColor(102, 126, 234);
  doc.setLineWidth(2);
  doc.roundedRect(25, 25, 247, 160, 5, 5, 'S');

  // Header
  doc.setFontSize(32);
  doc.setTextColor(102, 126, 234);
  doc.setFont('helvetica', 'bold');
  doc.text('CERTIFICATE OF COMPLETION', 148.5, 50, { align: 'center' });

  // Subtitle
  doc.setFontSize(14);
  doc.setTextColor(118, 75, 162); // #764ba2
  doc.setFont('helvetica', 'normal');
  doc.text('This is to certify that', 148.5, 70, { align: 'center' });

  // Student name
  doc.setFontSize(28);
  doc.setTextColor(51, 51, 51); // #333
  doc.setFont('helvetica', 'bold');
  doc.text(data.studentName, 148.5, 95, { align: 'center', maxWidth: 240 });

  // Course completion text
  doc.setFontSize(14);
  doc.setTextColor(118, 75, 162);
  doc.setFont('helvetica', 'normal');
  doc.text('has successfully completed the course', 148.5, 115, { align: 'center' });

  // Course name
  doc.setFontSize(20);
  doc.setTextColor(102, 126, 234);
  doc.setFont('helvetica', 'bold');
  doc.text(data.courseName, 148.5, 135, { align: 'center', maxWidth: 240 });

  // Date
  doc.setFontSize(12);
  doc.setTextColor(102, 102, 102);
  doc.setFont('helvetica', 'normal');
  const formattedDate = new Date(data.completionDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  doc.text(`Completed on: ${formattedDate}`, 148.5, 155, { align: 'center' });

  // Certificate number
  doc.setFontSize(10);
  doc.setTextColor(153, 153, 153);
  doc.setFont('helvetica', 'italic');
  doc.text(`Certificate No: ${data.certificateNumber}`, 148.5, 175, { align: 'center' });

  // Signature line (left)
  doc.setFontSize(10);
  doc.setTextColor(102, 102, 102);
  doc.setFont('helvetica', 'normal');
  doc.line(60, 160, 120, 160);
  doc.text('Instructor Signature', 90, 167, { align: 'center' });

  // Signature line (right)
  doc.line(177, 160, 237, 160);
  doc.text('Date', 207, 167, { align: 'center' });

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(153, 153, 153);
  doc.text('EdTec Online - This certificate is verifiable online', 148.5, 195, { align: 'center' });

  // Convert to buffer
  const pdfBlob = doc.output('arraybuffer');
  return Buffer.from(pdfBlob);
}

/**
 * Generate a unique certificate number
 */
export function generateCertificateNumber(enrollmentId: number): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `CERT-${year}-${enrollmentId.toString().padStart(6, '0')}-${random}`;
}

/**
 * Generate certificate HTML for email
 */
export function generateCertificateEmailHTML(data: CertificateData, certificateUrl: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Course Completion Certificate</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">🎓 Congratulations!</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">You've Completed Your Course</p>
      </div>
      
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <h2 style="color: #333; margin-top: 0;">Your Certificate is Ready!</h2>
        
        <p>Hello <strong>${data.studentName}</strong>,</p>
        
        <p>Congratulations on successfully completing <strong>${data.courseName}</strong>!</p>
        
        <div style="background: #e8f5e9; border-left: 4px solid #4caf50; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0;"><strong>📜 Your Certificate Details:</strong></p>
          <ul style="margin: 10px 0 0 0; padding-left: 20px;">
            <li>Course: <strong>${data.courseName}</strong></li>
            <li>Completion Date: <strong>${new Date(data.completionDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</strong></li>
            <li>Certificate Number: <strong>${data.certificateNumber}</strong></li>
            ${data.grade ? `<li>Grade: <strong>${data.grade}</strong></li>` : ''}
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${certificateUrl}" 
             style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 10px;">
            📥 Download Your Certificate
          </a>
        </div>
        
        <div style="background: #e7f3ff; border-left: 4px solid #2196F3; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0;"><strong>💡 What's Next?</strong></p>
          <p style="margin: 5px 0 0 0;">You can view and download your certificate anytime from your student dashboard. Share your achievement on social media!</p>
        </div>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="color: #666; font-size: 12px; margin: 0;">
          This is an automated email from EdTec Online Student Management System.<br>
          If you have any questions, please contact our support team.
        </p>
      </div>
    </body>
    </html>
  `;
}

