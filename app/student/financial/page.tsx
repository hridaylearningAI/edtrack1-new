'use client'

import StudentLayout from "@/components/student/student-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  DollarSign, 
  CreditCard, 
  Download, 
  Calendar, 
  AlertCircle, 
  CheckCircle,
  TrendingUp,
  Receipt,
  FileText,
  Eye,
  Loader2,
  RefreshCw
} from "lucide-react"
import { usePurchases } from "@/lib/hooks/usePurchases"
import { useUser } from "@/lib/hooks/useUser"

export default function FinancialPage() {
  const { user, isAuthenticated, isLoading: userLoading } = useUser();
  const {
    financialSummary,
    paymentHistory,
    invoices,
    loading,
    summaryLoading,
    paymentsLoading,
    invoicesLoading,
    error,
    paymentsError,
    invoicesError,
    refreshAll,
    clearError,
    clearPaymentsError,
    clearInvoicesError
  } = usePurchases();

  // Show loading state while user data is being fetched
  if (userLoading || !isAuthenticated || !user) {
    return (
      <StudentLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Loading...</h2>
            <p className="text-muted-foreground">Please wait while we load your financial information</p>
          </div>
        </div>
      </StudentLayout>
    );
  }


  return (
    <StudentLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-foreground">Financial Information</h2>
            <p className="text-muted-foreground mt-2">Manage your tuition, payments, and financial aid</p>
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              onClick={refreshAll}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Refresh
            </Button>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Download Statement
            </Button>
            <Button className="bg-primary hover:bg-primary/90">
              <CreditCard className="mr-2 h-4 w-4" />
              Make Payment
            </Button>
          </div>
        </div>

        {/* Financial Overview Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-foreground">
                    {summaryLoading ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      `$${financialSummary?.totalTuition?.toLocaleString() || '0'}`
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Total Tuition</p>
                </div>
                <DollarSign className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-foreground">
                    {summaryLoading ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      `$${financialSummary?.paidAmount?.toLocaleString() || '0'}`
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Amount Paid</p>
                </div>
                <CheckCircle className="h-8 w-8 text-success" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-foreground">
                    {summaryLoading ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      `$${financialSummary?.scholarshipAmount?.toLocaleString() || '0'}`
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Scholarships</p>
                </div>
                <TrendingUp className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="payments">Payment History</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming Payments</TabsTrigger>
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Payment Plan Details */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Plan Details</CardTitle>
                <CardDescription>Your current payment arrangement</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Payment Plan:</span>
                    <span className="text-sm">{financialSummary?.paymentPlan || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Total Credits:</span>
                    <span className="text-sm">{financialSummary?.totalCredits || '0'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Cost per Credit:</span>
                    <span className="text-sm">${financialSummary?.costPerCredit?.toLocaleString() || '0'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Next Payment Due:</span>
                    <span className="text-sm font-medium text-warning">
                      {financialSummary?.nextPaymentDue ? 
                        new Date(financialSummary.nextPaymentDue).toLocaleDateString() : 
                        'N/A'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
                <CardDescription>Your completed payments and transactions</CardDescription>
              </CardHeader>
              <CardContent>
                {paymentsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="ml-2 text-muted-foreground">Loading payment history...</span>
                  </div>
                ) : paymentsError ? (
                  <div className="text-center py-8">
                    <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
                    <p className="text-destructive mb-2">{paymentsError}</p>
                    <Button variant="outline" onClick={() => { clearPaymentsError(); }}>Try Again</Button>
                  </div>
                ) : paymentHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <Receipt className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No payment history found</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {paymentHistory.map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-success-soft rounded-full flex items-center justify-center">
                            <CheckCircle className="h-5 w-5 text-success" />
                          </div>
                          <div>
                            <h4 className="font-medium">{payment.description}</h4>
                            <p className="text-sm text-muted-foreground">
                              {new Date(payment.paymentDate).toLocaleDateString()} • {payment.paymentMethod} • Ref: {payment.reference || payment.transactionId || 'N/A'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold">${payment.amount.toLocaleString()}</div>
                          <Badge 
                            variant={payment.status === 'completed' ? 'default' : 'secondary'}
                            className={payment.status === 'completed' ? 'bg-success' : ''}
                          >
                            {payment.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="upcoming" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Payments</CardTitle>
                <CardDescription>Scheduled payments and due dates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No upcoming payments scheduled</p>
                  <p className="text-sm text-muted-foreground mt-2">All payments are up to date</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invoices" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Invoices</CardTitle>
                <CardDescription>Your billing statements and invoices</CardDescription>
              </CardHeader>
              <CardContent>
                {invoicesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="ml-2 text-muted-foreground">Loading invoices...</span>
                  </div>
                ) : invoicesError ? (
                  <div className="text-center py-8">
                    <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
                    <p className="text-destructive mb-2">{invoicesError}</p>
                    <Button variant="outline" onClick={() => { clearInvoicesError(); }}>Try Again</Button>
                  </div>
                ) : invoices.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No invoices found</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {invoices.map((invoice) => (
                      <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-primary-soft rounded-full flex items-center justify-center">
                            <Receipt className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-medium">{invoice.invoiceNumber}</h4>
                            <p className="text-sm text-muted-foreground">
                              {invoice.description} • Due: {new Date(invoice.dueDate).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="text-right">
                            <div className="text-lg font-bold">${invoice.amount.toLocaleString()}</div>
                            <Badge 
                              variant={invoice.status === "overdue" ? "destructive" : 
                                     invoice.status === "paid" ? "default" : "outline"}
                              className={invoice.status === "paid" ? "bg-success" : ""}
                            >
                              {invoice.status}
                            </Badge>
                          </div>
                          <Button variant="outline" size="sm">
                            <Eye className="mr-1 h-3 w-3" />
                            View
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </StudentLayout>
  );
}