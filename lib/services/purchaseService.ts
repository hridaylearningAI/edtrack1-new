// Purchase API service for EdTec Student Management System
import { 
  Purchase, 
  Invoice, 
  PaymentHistory, 
  FinancialSummary, 
  PurchaseCreate, 
  PurchaseUpdate,
  ApiResponse,
  PaginatedResponse 
} from '../types/purchases';

// Configuration - Use local Next.js API routes
const config = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || '/api'
};

// API URL helper function
const getApiUrl = (endpoint: string): string => {
  return `${config.apiBaseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
};

// Get authorization headers
const getAuthHeaders = (accessToken: string) => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${accessToken}`,
});

class PurchaseService {
  private static instance: PurchaseService;

  private constructor() {}

  static getInstance(): PurchaseService {
    if (!PurchaseService.instance) {
      PurchaseService.instance = new PurchaseService();
    }
    return PurchaseService.instance;
  }

  // Get user's purchase history
  async getUserPurchases(userId: string, accessToken: string, page = 1, limit = 10): Promise<PaginatedResponse<Purchase>> {
    try {
      const url = getApiUrl(`/purchases?user_id=${userId}&page=${page}&limit=${limit}`);
      const response = await fetch(url, {
        headers: getAuthHeaders(accessToken),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText);
        throw new Error(`Failed to fetch purchases: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch purchases');
      }
      
      // Transform the backend response to match our frontend types
      // purchase_summary view has: total_amount, subtotal, discount_amount, tax_amount (all numeric), items (ARRAY)
      // PostgreSQL numeric often comes back as string — always coerce to number
      const resolveAmount = (row: any): number => {
        const asNum = (x: unknown): number => (x != null && x !== '' ? Number(x) : NaN);
        const n = asNum(row.total_amount ?? row.amount ?? row.totalAmount ?? row.total_price);
        if (!Number.isNaN(n) && n > 0) return n;
        // Fallback: view has subtotal, discount_amount, tax_amount — compute total if total_amount is missing/zero
        const sub = asNum(row.subtotal);
        const disc = asNum(row.discount_amount);
        const tax = asNum(row.tax_amount);
        if (!Number.isNaN(sub)) {
          const computed = sub - (Number.isNaN(disc) ? 0 : disc) + (Number.isNaN(tax) ? 0 : tax);
          if (computed > 0) return computed;
          if (sub > 0) return sub;
        }
        // Sum from items[] if the view exposes it
        if (Array.isArray(row.items) && row.items.length > 0) {
          const sum = row.items.reduce((s: number, i: any) => s + (Number(i.total_price ?? i.totalPrice ?? i.unit_price * (i.quantity ?? 1) ?? 0) || 0), 0);
          if (sum > 0) return sum;
        }
        return 0;
      };

      const transformedPurchases: Purchase[] = (result.data || []).map((purchase: any) => {
        // Handle both purchase_summary view format and direct purchases table format
        const purchaseId = purchase.purchase_id || purchase.id;
        const userId = purchase.user_id || purchase.userId;
        const totalAmount = resolveAmount(purchase);
        const status = purchase.status || 'pending';
        
        return {
          id: purchaseId?.toString() || '',
          userId: userId?.toString() || '',
          courseId: purchase.course_id?.toString() || 'unknown',
          courseName: purchase.course_name || purchase.name || 'Unknown Course',
          amount: totalAmount,
          currency: purchase.currency || 'USD',
          purchaseDate: purchase.created_at || purchase.purchaseDate || new Date().toISOString(),
          status: status === 'completed' ? 'completed' : 'pending',
          paymentMethod: purchase.payment_method || purchase.paymentMethod || 'stripe',
          transactionId: purchase.payment_intent_id || purchase.transactionId || '',
          invoiceId: purchase.purchase_number || purchase.invoiceId || '',
          description: purchase.course_name || purchase.description || 'Course Purchase',
          createdAt: purchase.created_at || new Date().toISOString(),
          updatedAt: purchase.updated_at || purchase.created_at || new Date().toISOString(),
          metadata: {
            purchaseNumber: purchase.purchase_number,
            cartId: purchase.cart_id,
          },
        };
      });

      return {
        success: true,
        data: transformedPurchases,
        pagination: {
          page: result.page || page,
          limit: result.limit || limit,
          total: result.count || transformedPurchases.length,
          totalPages: Math.ceil((result.count || transformedPurchases.length) / (result.limit || limit)),
        },
      };
    } catch (error) {
      console.error('Error fetching user purchases:', error);
      throw error;
    }
  }

  // Get user's payment history (derived from purchases)
  async getUserPaymentHistory(userId: string, accessToken: string, page = 1, limit = 10): Promise<PaginatedResponse<PaymentHistory>> {
    try {
      // Get user's purchases and convert to payment history
      const purchasesResult = await this.getUserPurchases(userId, accessToken, 1, 1000); // Get all purchases
      if (!purchasesResult.success || !purchasesResult.data) {
        throw new Error('Failed to fetch purchases for payment history');
      }

      const purchases = purchasesResult.data;
      const paymentHistory: PaymentHistory[] = purchases
        .filter((p: Purchase) => p.status === 'completed')
        .map((purchase: Purchase) => ({
          id: purchase.id,
          userId: purchase.userId,
          invoiceId: '',
          purchaseId: purchase.id,
          amount: purchase.amount,
          currency: purchase.currency,
          paymentMethod: purchase.paymentMethod,
          status: 'completed' as const,
          transactionId: purchase.transactionId,
          description: purchase.description,
          paymentDate: purchase.purchaseDate,
          createdAt: purchase.createdAt,
        }));

      // Apply pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedItems = paymentHistory.slice(startIndex, endIndex);

      return {
        success: true,
        data: paginatedItems,
        pagination: {
          page,
          limit,
          total: paymentHistory.length,
          totalPages: Math.ceil(paymentHistory.length / limit),
        },
      };
    } catch (error) {
      console.error('Error fetching payment history:', error);
      throw error;
    }
  }

  // Get user's invoices (derived from purchases)
  async getUserInvoices(userId: string, accessToken: string, page = 1, limit = 10): Promise<PaginatedResponse<Invoice>> {
    try {
      // Get user's purchases and convert to invoices
      const purchasesResult = await this.getUserPurchases(userId, accessToken, 1, 1000); // Get all purchases
      if (!purchasesResult.success || !purchasesResult.data) {
        throw new Error('Failed to fetch purchases for invoices');
      }

      const purchases = purchasesResult.data;
      const invoices: Invoice[] = purchases.map((purchase: Purchase) => ({
        id: purchase.id,
        userId: purchase.userId,
        invoiceNumber: `INV-${purchase.id}`,
        amount: purchase.amount,
        currency: purchase.currency,
        status: purchase.status === 'completed' ? 'paid' : 'sent',
        dueDate: purchase.purchaseDate,
        description: purchase.description,
        lineItems: [{
          id: purchase.id,
          description: purchase.courseName || 'Course Purchase',
          quantity: 1,
          unitPrice: purchase.amount,
          totalPrice: purchase.amount,
        }],
        paymentMethod: purchase.paymentMethod,
        paymentDate: purchase.status === 'completed' ? purchase.purchaseDate : undefined,
        createdAt: purchase.createdAt,
        updatedAt: purchase.updatedAt,
      }));

      // Apply pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedItems = invoices.slice(startIndex, endIndex);

      return {
        success: true,
        data: paginatedItems,
        pagination: {
          page,
          limit,
          total: invoices.length,
          totalPages: Math.ceil(invoices.length / limit),
        },
      };
    } catch (error) {
      console.error('Error fetching invoices:', error);
      throw error;
    }
  }

  // Get user's financial summary (derived from purchases)
  async getUserFinancialSummary(userId: string, accessToken: string): Promise<ApiResponse<FinancialSummary>> {
    try {
      // Get user's purchases to calculate financial summary
      const purchasesResult = await this.getUserPurchases(userId, accessToken, 1, 1000); // Get all purchases
      if (!purchasesResult.success || !purchasesResult.data) {
        return { success: false, error: 'Failed to fetch purchases for financial summary' };
      }

      const purchases = purchasesResult.data;
      
      // Calculate financial summary from purchases
      const totalTuition = purchases.reduce((sum: number, purchase: Purchase) => sum + purchase.amount, 0);
      const paidAmount = purchases
        .filter((p: Purchase) => p.status === 'completed')
        .reduce((sum: number, purchase: Purchase) => sum + purchase.amount, 0);
      const outstandingBalance = totalTuition - paidAmount;
      
      const financialSummary: FinancialSummary = {
        userId,
        totalTuition,
        paidAmount,
        outstandingBalance,
        paymentPlan: 'Standard',
        scholarshipAmount: 0, // Not implemented yet
        totalCredits: purchases.length,
        costPerCredit: purchases.length > 0 ? totalTuition / purchases.length : 0,
        currency: 'USD',
        lastUpdated: new Date().toISOString(),
      };

      return { success: true, data: financialSummary };
    } catch (error) {
      console.error('Error fetching financial summary:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch financial summary' };
    }
  }

  // Create a new purchase
  async createPurchase(purchaseData: PurchaseCreate, accessToken: string): Promise<ApiResponse<Purchase>> {
    try {
      const response = await fetch(getApiUrl('/purchases'), {
        method: 'POST',
        headers: getAuthHeaders(accessToken),
        body: JSON.stringify(purchaseData),
      });

      if (!response.ok) {
        throw new Error(`Failed to create purchase: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating purchase:', error);
      throw error;
    }
  }

  // Update purchase status
  async updatePurchase(purchaseId: string, updateData: PurchaseUpdate, accessToken: string): Promise<ApiResponse<Purchase>> {
    try {
      const response = await fetch(getApiUrl(`/purchases/${purchaseId}`), {
        method: 'PATCH',
        headers: getAuthHeaders(accessToken),
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error(`Failed to update purchase: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating purchase:', error);
      throw error;
    }
  }

  // Get all purchases (admin only)
  async getAllPurchases(accessToken: string, page = 1, limit = 10): Promise<PaginatedResponse<Purchase>> {
    try {
      const response = await fetch(
        getApiUrl(`/purchases?page=${page}&limit=${limit}`),
        {
          headers: getAuthHeaders(accessToken),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch all purchases: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching all purchases:', error);
      throw error;
    }
  }

  // Get all invoices (admin only)
  async getAllInvoices(accessToken: string, page = 1, limit = 10): Promise<PaginatedResponse<Invoice>> {
    try {
      const response = await fetch(
        getApiUrl(`/invoices?page=${page}&limit=${limit}`),
        {
          headers: getAuthHeaders(accessToken),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch all invoices: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching all invoices:', error);
      throw error;
    }
  }

  // Get all payments (admin only)
  async getAllPayments(accessToken: string, page = 1, limit = 10): Promise<PaginatedResponse<PaymentHistory>> {
    try {
      const response = await fetch(
        getApiUrl(`/payments?page=${page}&limit=${limit}`),
        {
          headers: getAuthHeaders(accessToken),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch all payments: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching all payments:', error);
      throw error;
    }
  }
}

export const purchaseService = PurchaseService.getInstance();
export default purchaseService;
