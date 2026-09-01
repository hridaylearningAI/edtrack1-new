'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { X, Receipt, User, Calendar, DollarSign, CreditCard, Mail, FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

interface InvoiceDetailsDialogProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
}

export function InvoiceDetailsDialog({ invoice, isOpen, onClose }: InvoiceDetailsDialogProps) {
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  if (!invoice) return null;

  const handleDownloadPDF = async () => {
    if (!invoiceRef.current) return;

    try {
      setIsGeneratingPDF(true);
      
      // Create a temporary container for PDF generation
      const pdfContainer = document.createElement('div');
      pdfContainer.style.width = '210mm'; // A4 width
      pdfContainer.style.padding = '20mm';
      pdfContainer.style.backgroundColor = '#ffffff';
      pdfContainer.style.fontFamily = 'Arial, sans-serif';
      pdfContainer.style.position = 'absolute';
      pdfContainer.style.left = '-9999px';
      document.body.appendChild(pdfContainer);

      // Clone the invoice content
      const clonedContent = invoiceRef.current.cloneNode(true) as HTMLElement;
      
      // Remove buttons
      const buttons = clonedContent.querySelectorAll('button');
      buttons.forEach(btn => btn.remove());
      
      // Add logo and company info at the top
      const logoSection = document.createElement('div');
      logoSection.style.display = 'flex';
      logoSection.style.justifyContent = 'space-between';
      logoSection.style.alignItems = 'center';
      logoSection.style.marginBottom = '30px';
      logoSection.style.paddingBottom = '20px';
      logoSection.style.borderBottom = '2px solid #e5e7eb';
      
      // Create logo container
      const logoContainer = document.createElement('div');
      logoContainer.style.display = 'flex';
      logoContainer.style.alignItems = 'center';
      logoContainer.style.gap = '15px';
      
      // Try to load logo as base64 or use text fallback
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
      
      pdfContainer.appendChild(logoSection);
      pdfContainer.appendChild(clonedContent);

      // Wait for logo to load
      await new Promise(resolve => setTimeout(resolve, 500));

      // Generate canvas from the container using html2canvas-pro
      // html2canvas-pro supports modern CSS including oklch colors
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
      pdf.save(`Invoice-${invoice.id}-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Paid":
        return <Badge variant="default" className="bg-green-600 text-white">Paid</Badge>;
      case "Pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "Overdue":
        return <Badge variant="destructive">Overdue</Badge>;
      case "Partial":
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Partial</Badge>;
      case "Cancelled":
        return <Badge variant="outline">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status || 'Unknown'}</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Invoice Details
          </DialogTitle>
          <DialogDescription>
            Invoice #{invoice.id}
          </DialogDescription>
        </DialogHeader>

        {/* Company Logo Section */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b">
          <div className="flex items-center gap-4">
            <Image 
              src="/images/etia-logo.png" 
              alt="ETIA Logo" 
              width={60} 
              height={60} 
              className="object-contain"
            />
            <div>
              <h2 className="text-xl font-bold text-foreground">ETIA</h2>
              <p className="text-sm text-muted-foreground">Education Technology & Innovation Academy</p>
            </div>
          </div>
        </div>

        <div ref={invoiceRef} className="space-y-6">
          {/* Invoice Header */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Invoice Number</p>
              <p className="text-lg font-semibold">{invoice.id}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Status</p>
              <div className="mt-1">{getStatusBadge(invoice.status)}</div>
            </div>
          </div>

          {/* Student Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                Student Information
              </h3>
              <div className="space-y-3 p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src="/placeholder.svg" alt={invoice.student_name || 'Student'} />
                    <AvatarFallback>
                      {(invoice.student_name || 'Student').split(" ").map((n) => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">{invoice.student_name || 'Unknown Student'}</p>
                    <p className="text-sm text-muted-foreground">ID: {invoice.student_id}</p>
                    {invoice.student_email && (
                      <p className="text-sm text-muted-foreground mt-1">{invoice.student_email}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Course Information
              </h3>
              <div className="space-y-3 p-4 border rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Course</p>
                  <p className="font-medium">{invoice.course_name || 'N/A'}</p>
                </div>
                {invoice.course_id && (
                  <div>
                    <p className="text-sm text-muted-foreground">Course ID</p>
                    <p className="font-medium">{invoice.course_id}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Payment Details */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Payment Details
            </h3>
            <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-2xl font-bold">{formatCurrency(invoice.amount || 0)}</p>
              </div>
              {invoice.paid_amount !== undefined && invoice.paid_amount > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground">Paid Amount</p>
                  <p className="text-xl font-semibold text-green-600">
                    {formatCurrency(invoice.paid_amount)}
                  </p>
                </div>
              )}
              {invoice.status === "Partial" && invoice.paid_amount !== undefined && (
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Remaining Balance</p>
                  <p className="text-lg font-semibold text-orange-600">
                    {formatCurrency((invoice.amount || 0) - (invoice.paid_amount || 0))}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Dates */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Important Dates
            </h3>
            <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Issue Date</p>
                <p className="font-medium">
                  {new Date(invoice.issue_date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Payment Date</p>
                <p className="font-medium">
                  {invoice.payment_date
                    ? new Date(invoice.payment_date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    : new Date(invoice.due_date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                </p>
              </div>
              {invoice.status === "Overdue" && (
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Days Overdue</p>
                  <p className="font-medium text-destructive">
                    {Math.ceil(
                      (new Date().getTime() - new Date(invoice.due_date).getTime()) / (1000 * 3600 * 24)
                    )}{' '}
                    days
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Payment Method */}
          {invoice.payment_method && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Method
              </h3>
              <div className="p-4 border rounded-lg">
                <p className="font-medium capitalize">{invoice.payment_method}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button 
              variant="default" 
              onClick={handleDownloadPDF}
              disabled={isGeneratingPDF}
            >
              <Download className="mr-2 h-4 w-4" />
              {isGeneratingPDF ? 'Generating PDF...' : 'Download PDF'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

