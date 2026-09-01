'use client'

import { useState, useEffect, useCallback } from 'react';
import { 
  Purchase, 
  Invoice, 
  PaymentHistory, 
  FinancialSummary, 
  PurchaseCreate, 
  PurchaseUpdate,
  PaginatedResponse 
} from '@/lib/types/purchases';
import { purchaseService } from '@/lib/services/purchaseService';
import { useUser } from '@/lib/hooks/useUser';
import { listenForCrossAppPurchaseChanges } from '@/lib/crossAppAuth';

interface UsePurchasesReturn {
  // Data
  purchases: Purchase[];
  invoices: Invoice[];
  paymentHistory: PaymentHistory[];
  financialSummary: FinancialSummary | null;
  
  // Loading states
  loading: boolean;
  purchasesLoading: boolean;
  invoicesLoading: boolean;
  paymentsLoading: boolean;
  summaryLoading: boolean;
  
  // Error states
  error: string | null;
  purchasesError: string | null;
  invoicesError: string | null;
  paymentsError: string | null;
  summaryError: string | null;
  
  // Pagination
  purchasesPagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null;
  invoicesPagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null;
  paymentsPagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null;
  
  // Actions
  fetchPurchases: (page?: number, limit?: number) => Promise<void>;
  fetchInvoices: (page?: number, limit?: number) => Promise<void>;
  fetchPaymentHistory: (page?: number, limit?: number) => Promise<void>;
  fetchFinancialSummary: () => Promise<void>;
  createPurchase: (purchaseData: PurchaseCreate) => Promise<Purchase | null>;
  updatePurchase: (purchaseId: string, updateData: PurchaseUpdate) => Promise<Purchase | null>;
  refreshAll: () => Promise<void>;
  
  // Clear errors
  clearError: () => void;
  clearPurchasesError: () => void;
  clearInvoicesError: () => void;
  clearPaymentsError: () => void;
  clearSummaryError: () => void;
}

export function usePurchases(): UsePurchasesReturn {
  const { user, isAuthenticated, getAccessToken } = useUser();
  
  // Data state
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null);
  
  // Loading states
  const [loading, setLoading] = useState(false);
  const [purchasesLoading, setPurchasesLoading] = useState(false);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  
  // Error states
  const [error, setError] = useState<string | null>(null);
  const [purchasesError, setPurchasesError] = useState<string | null>(null);
  const [invoicesError, setInvoicesError] = useState<string | null>(null);
  const [paymentsError, setPaymentsError] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  
  // Pagination state
  const [purchasesPagination, setPurchasesPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null>(null);
  const [invoicesPagination, setInvoicesPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null>(null);
  const [paymentsPagination, setPaymentsPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null>(null);

  // Fetch purchases
  const fetchPurchases = useCallback(async (page = 1, limit = 10) => {
    if (!user?.id || !isAuthenticated) return;
    
    const accessToken = await getAccessToken();
    if (!accessToken) return;

    setPurchasesLoading(true);
    setPurchasesError(null);

    try {
      const response: PaginatedResponse<Purchase> = await purchaseService.getUserPurchases(
        user.id,
        accessToken,
        page,
        limit
      );

      if (response.success && response.data) {
        setPurchases(response.data);
        setPurchasesPagination(response.pagination);
      } else {
        setPurchasesError(response.error || 'Failed to fetch purchases');
      }
    } catch (err) {
      setPurchasesError(err instanceof Error ? err.message : 'Failed to fetch purchases');
    } finally {
      setPurchasesLoading(false);
    }
  }, [user?.id, isAuthenticated, getAccessToken]);

  // Fetch invoices
  const fetchInvoices = useCallback(async (page = 1, limit = 10) => {
    if (!user?.id || !isAuthenticated) return;
    
    const accessToken = await getAccessToken();
    if (!accessToken) return;

    setInvoicesLoading(true);
    setInvoicesError(null);

    try {
      const response = await purchaseService.getUserInvoices(
        user.id,
        accessToken,
        page,
        limit
      );

      if (response.success && response.data) {
        setInvoices(response.data);
        setInvoicesPagination(response.pagination);
      } else {
        setInvoicesError('Failed to fetch invoices');
      }
    } catch (err) {
      setInvoicesError(err instanceof Error ? err.message : 'Failed to fetch invoices');
    } finally {
      setInvoicesLoading(false);
    }
  }, [user?.id, isAuthenticated, getAccessToken]);

  // Fetch payment history
  const fetchPaymentHistory = useCallback(async (page = 1, limit = 10) => {
    if (!user?.id || !isAuthenticated) return;
    
    const accessToken = await getAccessToken();
    if (!accessToken) return;

    setPaymentsLoading(true);
    setPaymentsError(null);

    try {
      const response = await purchaseService.getUserPaymentHistory(
        user.id,
        accessToken,
        page,
        limit
      );

      if (response.success && response.data) {
        setPaymentHistory(response.data);
        setPaymentsPagination(response.pagination);
      } else {
        setPaymentsError('Failed to fetch payment history');
      }
    } catch (err) {
      setPaymentsError(err instanceof Error ? err.message : 'Failed to fetch payment history');
    } finally {
      setPaymentsLoading(false);
    }
  }, [user?.id, isAuthenticated, getAccessToken]);

  // Fetch financial summary
  const fetchFinancialSummary = useCallback(async () => {
    if (!user?.id || !isAuthenticated) return;
    
    const accessToken = await getAccessToken();
    if (!accessToken) return;

    setSummaryLoading(true);
    setSummaryError(null);

    try {
      const response = await purchaseService.getUserFinancialSummary(user.id, accessToken);

      if (response.success && response.data) {
        setFinancialSummary(response.data);
      } else {
        setSummaryError(response.error || 'Failed to fetch financial summary');
      }
    } catch (err) {
      setSummaryError(err instanceof Error ? err.message : 'Failed to fetch financial summary');
    } finally {
      setSummaryLoading(false);
    }
  }, [user?.id, isAuthenticated, getAccessToken]);

  // Create purchase
  const createPurchase = useCallback(async (purchaseData: PurchaseCreate): Promise<Purchase | null> => {
    if (!user?.id || !isAuthenticated) return null;
    
    const accessToken = await getAccessToken();
    if (!accessToken) return null;

    setLoading(true);
    setError(null);

    try {
      const response = await purchaseService.createPurchase(purchaseData, accessToken);

      if (response.success && response.data) {
        // Refresh purchases after creating
        await fetchPurchases();
        return response.data;
      } else {
        setError(response.error || 'Failed to create purchase');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create purchase');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user?.id, isAuthenticated, getAccessToken, fetchPurchases]);

  // Update purchase
  const updatePurchase = useCallback(async (purchaseId: string, updateData: PurchaseUpdate): Promise<Purchase | null> => {
    if (!isAuthenticated) return null;
    
    const accessToken = await getAccessToken();
    if (!accessToken) return null;

    setLoading(true);
    setError(null);

    try {
      const response = await purchaseService.updatePurchase(purchaseId, updateData, accessToken);

      if (response.success && response.data) {
        // Refresh purchases after updating
        await fetchPurchases();
        return response.data;
      } else {
        setError(response.error || 'Failed to update purchase');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update purchase');
      return null;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, getAccessToken, fetchPurchases]);

  // Refresh all data
  const refreshAll = useCallback(async () => {
    if (!user?.id || !isAuthenticated) return;

    setLoading(true);
    setError(null);

    try {
      await Promise.all([
        fetchPurchases(),
        fetchInvoices(),
        fetchPaymentHistory(),
        fetchFinancialSummary(),
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh data');
    } finally {
      setLoading(false);
    }
  }, [user?.id, isAuthenticated, fetchPurchases, fetchInvoices, fetchPaymentHistory, fetchFinancialSummary]);

  // Auto-fetch data when user is authenticated
  useEffect(() => {
    if (user?.id && isAuthenticated) {
      refreshAll();
    }
  }, [user?.id, isAuthenticated, refreshAll]);

  // Listen for cross-app purchase changes
  useEffect(() => {
    if (!user?.id || !isAuthenticated) return;

    const unsubscribePurchaseChanges = listenForCrossAppPurchaseChanges((purchaseData) => {
      
      // Check if the purchase is for the current user
      if (purchaseData.userId === user.id.toString()) {
        // Refresh all purchase data to show the new purchase
        refreshAll();
      }
    });

    return () => {
      unsubscribePurchaseChanges();
    };
  }, [user?.id, isAuthenticated, refreshAll]);

  // Clear error functions
  const clearError = () => setError(null);
  const clearPurchasesError = () => setPurchasesError(null);
  const clearInvoicesError = () => setInvoicesError(null);
  const clearPaymentsError = () => setPaymentsError(null);
  const clearSummaryError = () => setSummaryError(null);

  return {
    // Data
    purchases,
    invoices,
    paymentHistory,
    financialSummary,
    
    // Loading states
    loading,
    purchasesLoading,
    invoicesLoading,
    paymentsLoading,
    summaryLoading,
    
    // Error states
    error,
    purchasesError,
    invoicesError,
    paymentsError,
    summaryError,
    
    // Pagination
    purchasesPagination,
    invoicesPagination,
    paymentsPagination,
    
    // Actions
    fetchPurchases,
    fetchInvoices,
    fetchPaymentHistory,
    fetchFinancialSummary,
    createPurchase,
    updatePurchase,
    refreshAll,
    
    // Clear errors
    clearError,
    clearPurchasesError,
    clearInvoicesError,
    clearPaymentsError,
    clearSummaryError,
  };
}
