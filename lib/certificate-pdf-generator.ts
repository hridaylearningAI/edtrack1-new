import jsPDF from 'jspdf'

export interface CertificateData {
  id: string
  studentName: string
  studentEmail: string
  course: string
  completionDate: string
  issueDate: string
  certificateNumber: string
  grade: string
  status: string
}

export class CertificatePDFGenerator {
  private static async loadLogo(): Promise<string> {
    try {
      const response = await fetch('/images/etia-logo.png')
      const blob = await response.blob()
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.readAsDataURL(blob)
      })
    } catch (error) {
      console.error('Failed to load logo:', error)
      return ''
    }
  }

//   static async generatePDF(certificateData: CertificateData): Promise<void> {
//     try {
//       // Create PDF in landscape mode
//       const pdf = new jsPDF('landscape', 'mm', 'a4')
//       const pageWidth = pdf.internal.pageSize.getWidth()
//       const pageHeight = pdf.internal.pageSize.getHeight()
      
//       // Create gradient-like background effect
//       pdf.setFillColor(102, 126, 234)
//       pdf.rect(0, 0, pageWidth, pageHeight, 'F')
      
//       // Add subtle pattern overlay
//       pdf.setFillColor(255, 255, 255, 0.05)
//       for (let i = 0; i < pageWidth; i += 20) {
//         for (let j = 0; j < pageHeight; j += 20) {
//           pdf.circle(i, j, 1, 'F')
//         }
//       }
      
//       // Create certificate background with better proportions
//       const margin = 30 // Increased margin for better spacing
//       const certWidth = pageWidth - (margin * 2)
//       const certHeight = pageHeight - (margin * 2)
      
//       // Certificate background with shadow effect
//       pdf.setFillColor(255, 255, 255)
//       pdf.roundedRect(margin, margin, certWidth, certHeight, 15, 15, 'F')
      
//       // Add inner border
//       pdf.setDrawColor(102, 126, 234)
//       pdf.setLineWidth(0.5)
//       pdf.roundedRect(margin + 2, margin + 2, certWidth - 4, certHeight - 4, 13, 13, 'S')
      
//       // Top decorative border
//       pdf.setFillColor(102, 126, 234)
//       pdf.roundedRect(margin, margin, certWidth, 12, 15, 15, 'F')
      
//       // Add decorative elements
//       pdf.setFillColor(255, 255, 255, 0.1)
//       pdf.circle(margin + 30, margin + 6, 3, 'F')
//       pdf.circle(pageWidth - margin - 30, margin + 6, 3, 'F')
      
//       // Try to add logo with better positioning
//       try {
//         const logoUrl = await this.loadLogo()
//         if (logoUrl) {
//           pdf.addImage(logoUrl, 'PNG', margin + 40, margin + 35, 35, 35)
//         }
//       } catch (error) {
//         console.warn('Could not add logo:', error)
//       }
      
//       // Company name and tagline with better typography
//       pdf.setFont('helvetica', 'bold')
//       pdf.setFontSize(28)
//       pdf.setTextColor(26, 32, 44)
//       pdf.text('EdTec Institute', margin + 90, margin + 50)
      
//       pdf.setFont('helvetica', 'normal')
//       pdf.setFontSize(14)
//       pdf.setTextColor(113, 128, 150)
//       pdf.text('Empowering Education Through Technology', margin + 90, margin + 62)
      
//       // Decorative line
//       pdf.setDrawColor(102, 126, 234)
//       pdf.setLineWidth(0.5)
//       pdf.line(margin + 40, margin + 85, pageWidth - margin - 40, margin + 85)
      
//       // Certificate title with better hierarchy and positioning
//       pdf.setFont('helvetica', 'bold')
//       pdf.setFontSize(38) // Slightly smaller to avoid overlap
//       pdf.setTextColor(45, 55, 72)
//       const titleText = 'Certificate of Completion'
//       const titleWidth = pdf.getTextWidth(titleText)
//       pdf.text(titleText, (pageWidth - titleWidth) / 2, margin + 115)
      
//       // Subtitle with better spacing
//       pdf.setFont('helvetica', 'normal')
//       pdf.setFontSize(18)
//       pdf.setTextColor(113, 128, 150)
//       const subtitleText = 'This is to certify that'
//       const subtitleWidth = pdf.getTextWidth(subtitleText)
//       pdf.text(subtitleText, (pageWidth - subtitleWidth) / 2, margin + 140)
      
//       // Student name with emphasis
//       pdf.setFont('helvetica', 'bold')
//       pdf.setFontSize(32)
//       pdf.setTextColor(45, 55, 72)
//       const studentNameWidth = pdf.getTextWidth(certificateData.studentName)
//       pdf.text(certificateData.studentName, (pageWidth - studentNameWidth) / 2, margin + 165)
      
//       // Certificate text with better formatting and positioning
//       pdf.setFont('helvetica', 'normal')
//       pdf.setFontSize(16)
//       pdf.setTextColor(74, 85, 104)
      
//       const courseText = `has successfully completed the course "${certificateData.course}" with distinction and demonstrated exceptional commitment to learning and professional development.`
      
//       // Improved text wrapping with much better positioning
//       const maxWidth = certWidth - 100 // Much larger margin for better text flow
//       const words = courseText.split(' ')
//       let currentLine = ''
//       let yPosition = margin + 190 // Better starting position
//       const lineHeight = 14 // Increased line height for better readability
      
//       for (const word of words) {
//         const testLine = currentLine + (currentLine ? ' ' : '') + word
//         const testWidth = pdf.getTextWidth(testLine)
        
//         if (testWidth <= maxWidth) {
//           currentLine = testLine
//         } else {
//           if (currentLine) {
//             const lineWidth = pdf.getTextWidth(currentLine)
//             pdf.text(currentLine, (pageWidth - lineWidth) / 2, yPosition)
//             yPosition += lineHeight
//           }
//           currentLine = word
//         }
//       }
      
//       // Add the last line
//       if (currentLine) {
//         const lineWidth = pdf.getTextWidth(currentLine)
//         pdf.text(currentLine, (pageWidth - lineWidth) / 2, yPosition)
//         yPosition += lineHeight
//       }
      
//       // Certificate details box with better design and positioning
//       const detailsY = yPosition + 35 // Much more spacing
//       pdf.setFillColor(248, 250, 252)
//       pdf.roundedRect(margin + 40, detailsY, certWidth - 80, 50, 8, 8, 'F')
      
//       // Add border to details box
//       pdf.setDrawColor(226, 232, 240)
//       pdf.setLineWidth(0.5)
//       pdf.roundedRect(margin + 40, detailsY, certWidth - 80, 50, 8, 8, 'S')
      
//       // Details content with better layout
//       const completionDate = new Date(certificateData.completionDate).toLocaleDateString('en-US', {
//         year: 'numeric',
//         month: 'long',
//         day: 'numeric'
//       })
      
//       const issueDate = new Date(certificateData.issueDate).toLocaleDateString('en-US', {
//         year: 'numeric',
//         month: 'long',
//         day: 'numeric'
//       })
      
//       // Completion Date
//       pdf.setFont('helvetica', 'normal')
//       pdf.setFontSize(11)
//       pdf.setTextColor(113, 128, 150)
//       pdf.text('COMPLETION DATE', margin + 60, detailsY + 18)
      
//       pdf.setFont('helvetica', 'bold')
//       pdf.setFontSize(13)
//       pdf.setTextColor(45, 55, 72)
//       pdf.text(completionDate, margin + 60, detailsY + 30)
      
//       // Grade with better positioning
//       const gradeX = pageWidth / 2
//       pdf.setFont('helvetica', 'normal')
//       pdf.setFontSize(11)
//       pdf.setTextColor(113, 128, 150)
//       pdf.text('GRADE ACHIEVED', gradeX, detailsY + 18)
      
//       pdf.setFont('helvetica', 'bold')
//       pdf.setFontSize(13)
//       pdf.setTextColor(56, 161, 105)
//       pdf.text(certificateData.grade, gradeX, detailsY + 30)
      
//       // Issue Date
//       const issueX = pageWidth - margin - 60
//       pdf.setFont('helvetica', 'normal')
//       pdf.setFontSize(11)
//       pdf.setTextColor(113, 128, 150)
//       pdf.text('ISSUE DATE', issueX, detailsY + 18)
      
//       pdf.setFont('helvetica', 'bold')
//       pdf.setFontSize(13)
//       pdf.setTextColor(45, 55, 72)
//       pdf.text(issueDate, issueX, detailsY + 30)
      
//       // Signatures with better design and positioning
//       const signaturesY = detailsY + 75 // More spacing
      
//       // Left signature
//       pdf.setDrawColor(45, 55, 72)
//       pdf.setLineWidth(1)
//       pdf.line(margin + 60, signaturesY, margin + 210, signaturesY)
      
//       pdf.setFont('helvetica', 'bold')
//       pdf.setFontSize(13)
//       pdf.setTextColor(45, 55, 72)
//       pdf.text('Dr. Sarah Johnson', margin + 60, signaturesY + 12)
      
//       pdf.setFont('helvetica', 'normal')
//       pdf.setFontSize(11)
//       pdf.setTextColor(113, 128, 150)
//       pdf.text('Academic Director', margin + 60, signaturesY + 24)
      
//       // Right signature
//       pdf.line(pageWidth - margin - 210, signaturesY, pageWidth - margin - 60, signaturesY)
      
//       pdf.setFont('helvetica', 'bold')
//       pdf.setFontSize(13)
//       pdf.setTextColor(45, 55, 72)
//       pdf.text('Michael Chen', pageWidth - margin - 210, signaturesY + 12)
      
//       pdf.setFont('helvetica', 'normal')
//       pdf.setFontSize(11)
//       pdf.setTextColor(113, 128, 150)
//       pdf.text('Course Instructor', pageWidth - margin - 210, signaturesY + 24)
      
//       // Certificate number with better positioning
//       pdf.setFont('helvetica', 'normal')
//       pdf.setFontSize(9)
//       pdf.setTextColor(160, 174, 192)
//       pdf.text(certificateData.certificateNumber, pageWidth - margin - 30, pageHeight - margin - 20)
      
//       // Subtle watermark - completely repositioned to avoid any overlap
//       pdf.setFont('helvetica', 'bold')
//       pdf.setFontSize(70) // Smaller size
//       pdf.setTextColor(102, 126, 234, 0.03) // Much more subtle
//       // Position watermark in the bottom right area, away from all text
//       pdf.text('CERTIFIED', pageWidth - 120, pageHeight - 80)
      
//       // Add decorative corner elements
//       pdf.setFillColor(102, 126, 234, 0.1)
//       pdf.circle(margin + 15, margin + 15, 8, 'F')
//       pdf.circle(pageWidth - margin - 15, margin + 15, 8, 'F')
//       pdf.circle(margin + 15, pageHeight - margin - 15, 8, 'F')
//       pdf.circle(pageWidth - margin - 15, pageHeight - margin - 15, 8, 'F')
      
//       // Generate filename
//       const filename = `certificate_${certificateData.studentName.replace(/\s+/g, '_')}_${certificateData.certificateNumber}.pdf`
      
//       // Download the PDF
//       pdf.save(filename)
      
//     } catch (error) {
//       console.error('Error generating PDF:', error)
//       throw new Error('Failed to generate certificate PDF')
//     }
//   }
static async generatePDF(certificateData: CertificateData): Promise<void> {
    try {
      const pdf = new jsPDF('landscape', 'mm', 'a4')
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
  
      // === BACKGROUND ===
      pdf.setFillColor(102, 126, 234)
      pdf.rect(0, 0, pageWidth, pageHeight, 'F')
  
      // Subtle pattern
      pdf.setFillColor(255, 255, 255, 0.04)
      for (let i = 0; i < pageWidth; i += 25) {
        for (let j = 0; j < pageHeight; j += 25) {
          pdf.circle(i, j, 0.8, 'F')
        }
      }
  
      const margin = 25
      const certWidth = pageWidth - margin * 2
      const certHeight = pageHeight - margin * 2
  
      // Certificate container
      pdf.setFillColor(255, 255, 255)
      pdf.roundedRect(margin, margin, certWidth, certHeight, 12, 12, 'F')
      pdf.setDrawColor(200, 200, 200)
      pdf.roundedRect(margin + 3, margin + 3, certWidth - 6, certHeight - 6, 10, 10, 'S')
  
    //   // === WATERMARK (draw BEFORE other text so it stays in the background) ===
    //   pdf.setFont('helvetica', 'bold')
    //   pdf.setFontSize(60)
    //   pdf.setTextColor(102, 126, 234, 0.2) // Changed opacity to 0.2
    //   pdf.text('CERTIFIED', pageWidth / 2, pageHeight / 2 + 10, { align: 'center' })
  
      // === LOGO ===
      try {
        const logoUrl = await this.loadLogo()
        if (logoUrl) {
          pdf.addImage(logoUrl, 'PNG', margin + 15, margin + 15, 30, 30)
        }
      } catch {}
  
      // === HEADER ===
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(26)
      pdf.setTextColor(30, 30, 30)
      pdf.text('EdTec.online', margin + 50, margin + 28)
  
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(13)
      pdf.setTextColor(100, 100, 100)
      pdf.text('Empowering Education Through Technology', margin + 50, margin + 38)
  
      // Separator line
      pdf.setDrawColor(102, 126, 234)
      pdf.setLineWidth(1)
      pdf.line(margin + 20, margin + 50, pageWidth - margin - 20, margin + 50)
  
      // === TITLE ===
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(34)
      pdf.setTextColor(40, 40, 40)
      pdf.text('Certificate of Completion', pageWidth / 2, margin + 80, { align: 'center' })
  
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(18)
      pdf.setTextColor(100, 100, 100)
      pdf.text('This is to certify that', pageWidth / 2, margin + 100, { align: 'center' })
  
      // === NAME ===
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(30)
      pdf.setTextColor(20, 20, 20)
      pdf.text(certificateData.studentName, pageWidth / 2, margin + 120, { align: 'center' })
  
      // === COURSE TEXT ===
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(15)
      pdf.setTextColor(70, 70, 70)
      const courseText = `has successfully completed the course "${certificateData.course}" and demonstrated commitment to learning and professional development.`
      const wrappedText = pdf.splitTextToSize(courseText, certWidth - 80)
      pdf.text(wrappedText, pageWidth / 2, margin + 140, { align: 'center' })
  
      // === DETAILS BOX ===
      const detailsY = margin + 170
      pdf.setFillColor(248, 250, 252)
      pdf.roundedRect(margin + 30, detailsY, certWidth - 60, 40, 6, 6, 'F')
      pdf.setDrawColor(226, 232, 240)
      pdf.roundedRect(margin + 30, detailsY, certWidth - 60, 40, 6, 6, 'S')
  
      const completionDate = new Date(certificateData.completionDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      const issueDate = new Date(certificateData.issueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  
      const colX = [margin + 45, pageWidth / 2, pageWidth - margin - 100]
  
      // Completion Date
      pdf.setFontSize(10).setTextColor(120, 120, 120).setFont('helvetica', 'normal')
      pdf.text('COMPLETION DATE', colX[0], detailsY + 14)
      pdf.setFont('helvetica', 'bold').setFontSize(12).setTextColor(40, 40, 40)
      pdf.text(completionDate, colX[0], detailsY + 28)
  
      // Grade
      pdf.setFontSize(10).setTextColor(120, 120, 120).setFont('helvetica', 'normal')
      pdf.text('GRADE', colX[1], detailsY + 14, { align: 'center' })
      pdf.setFont('helvetica', 'bold').setFontSize(12).setTextColor(56, 161, 105)
      pdf.text(certificateData.grade, colX[1], detailsY + 28, { align: 'center' })
  
      // Issue Date
      pdf.setFontSize(10).setTextColor(120, 120, 120).setFont('helvetica', 'normal')
      pdf.text('ISSUE DATE', colX[2], detailsY + 14)
      pdf.setFont('helvetica', 'bold').setFontSize(12).setTextColor(40, 40, 40)
      pdf.text(issueDate, colX[2], detailsY + 28)
  
      // === SIGNATURES ===
      const sigY = detailsY + 70
      pdf.setDrawColor(50, 50, 50).setLineWidth(0.8)
  
      // Center signature
      const sigCenterX = pageWidth / 2
      const sigLineLength = 80
      pdf.line(sigCenterX - sigLineLength/2, sigY, sigCenterX + sigLineLength/2, sigY)
      pdf.setFont('helvetica', 'bold').setFontSize(12).setTextColor(40, 40, 40)
      pdf.text('Ashok Chanda', sigCenterX, sigY + 12, { align: 'center' })
      pdf.setFont('helvetica', 'normal').setFontSize(10).setTextColor(100, 100, 100)
      pdf.text('Founder', sigCenterX, sigY + 22, { align: 'center' })
  
      // Certificate Number
      pdf.setFont('helvetica', 'normal').setFontSize(9).setTextColor(160, 174, 192)
      pdf.text(certificateData.certificateNumber, pageWidth - margin - 30, pageHeight - margin - 15)
  
      // Save
      const filename = `certificate_${certificateData.studentName.replace(/\s+/g, '_')}_${certificateData.certificateNumber}.pdf`
      pdf.save(filename)
    } catch (error) {
      console.error('Error generating PDF:', error)
      throw new Error('Failed to generate certificate PDF')
    }
  }
  
  
}
