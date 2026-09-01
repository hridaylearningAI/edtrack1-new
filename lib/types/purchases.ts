// Purchase tracking types for EdTec Student Management System

export interface Purchase {
  id: string;
  userId: string;
  courseId?: string;
  courseName?: string;
  amount: number;
  currency: string;
  paymentMethod: 'credit_card' | 'bank_transfer' | 'paypal' | 'stripe' | 'other';
  status: 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled';
  transactionId?: string;
  description: string;
  purchaseDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: string;
  userId: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  dueDate: string;
  description: string;
  lineItems: InvoiceLineItem[];
  paymentMethod?: string;
  paymentDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface PaymentHistory {
  id: string;
  userId: string;
  invoiceId?: string;
  purchaseId?: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  transactionId?: string;
  description: string;
  reference?: string;
  paymentDate: string;
  createdAt: string;
}

export interface FinancialSummary {
  userId: string;
  totalTuition: number;
  paidAmount: number;
  outstandingBalance: number;
  nextPaymentDue?: string;
  daysUntilDue?: number;
  paymentPlan: string;
  scholarshipAmount: number;
  totalCredits: number;
  costPerCredit: number;
  currency: string;
  lastUpdated: string;
}

export interface PurchaseCreate {
  userId: string;
  courseId?: string;
  courseName?: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  description: string;
}

export interface PurchaseUpdate {
  status?: 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled';
  transactionId?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
