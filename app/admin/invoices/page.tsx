"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Search,
  Plus,
  CreditCard,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock,
  Eye,
  Download,
  Filter,
  Loader2,
} from "lucide-react"
import { useAdminPurchases } from "@/lib/hooks/useAdminPurchases"
import { InvoiceDetailsDialog } from "@/components/admin/invoice-details-dialog"
import { useState } from "react"

export default function InvoicesPaymentsPage() {
  const {
    invoices,
    payments,
    loading,
    error,
    totalInvoices,
    totalPayments,
    fetchPurchases,
    refreshData
  } = useAdminPurchases()

  const [searchTerm, setSearchTerm] = useState("")
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null)
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false)

  // Filter invoices based on search
  const filteredInvoices = invoices.filter((invoice) => 
    searchTerm === "" || 
    invoice.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (invoice.student_name && invoice.student_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (invoice.course_name && invoice.course_name.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  // Filter payments based on search
  const filteredPayments = payments.filter((payment) =>
    searchTerm === "" ||
    payment.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.invoice_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (payment.student_name && payment.student_name.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  // Calculate statistics
  const totalRevenue = invoices.filter((inv) => inv.status === "Paid").reduce((acc, inv) => acc + (inv.amount || 0), 0)
  const pendingAmount = invoices
    .filter((inv) => inv.status === "Pending" || inv.status === "Overdue")
    .reduce((acc, inv) => acc + (inv.amount || 0), 0)
  const overdueCount = invoices.filter((inv) => inv.status === "Overdue").length
  const paidCount = invoices.filter((inv) => inv.status === "Paid").length

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Paid":
        return (
          <Badge variant="default" className="bg-chart-3 text-white">
            <CheckCircle className="mr-1 h-3 w-3" />
            Paid
          </Badge>
        )
      case "Pending":
        return (
          <Badge variant="secondary">
            <Clock className="mr-1 h-3 w-3" />
            Pending
          </Badge>
        )
      case "Overdue":
        return (
          <Badge variant="destructive">
            <AlertCircle className="mr-1 h-3 w-3" />
            Overdue
          </Badge>
        )
      case "Partial":
        return (
          <Badge variant="default" className="bg-chart-4 text-white">
            <Clock className="mr-1 h-3 w-3" />
            Partial
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (loading && invoices.length === 0) {
    return (
              <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading invoices and payments...</span>
        </div>
    )
  }

  return (
    <>
          <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-foreground">Invoices & Payments</h2>
            <p className="text-muted-foreground mt-2">Manage student invoices and payment processing</p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" />
              Create Invoice
            </Button>
          </div>
        </div>

        {/* Financial Statistics */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-foreground">${totalRevenue.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">Total Revenue</p>
                </div>
                <DollarSign className="h-8 w-8 text-chart-3" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-foreground">${pendingAmount.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">Pending Amount</p>
                </div>
                <Clock className="h-8 w-8 text-chart-4" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-foreground">{paidCount}</div>
                  <p className="text-xs text-muted-foreground">Paid Invoices</p>
                </div>
                <CheckCircle className="h-8 w-8 text-chart-3" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-foreground">{overdueCount}</div>
                  <p className="text-xs text-muted-foreground">Overdue</p>
                </div>
                <AlertCircle className="h-8 w-8 text-chart-2" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Invoices & Payments */}
        <Tabs defaultValue="invoices" className="space-y-6">
          <TabsList>
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
          </TabsList>

          <TabsContent value="invoices" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Invoice Management</CardTitle>
                <CardDescription>Track and manage student invoices</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input 
                      placeholder="Search invoices..." 
                      className="pl-10" 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Button variant="outline">
                    <Filter className="mr-2 h-4 w-4" />
                    Filter
                  </Button>
                  <Button variant="outline">Export</Button>
                </div>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice</TableHead>
                        <TableHead>Student</TableHead>
                        <TableHead>Course</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Payment Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInvoices.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            {loading ? (
                              <div className="flex items-center justify-center">
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Loading...
                              </div>
                            ) : (
                              "No invoices found"
                            )}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredInvoices.map((invoice, index) => (
                          <TableRow key={invoice.id || `invoice-${index}`}>
                            <TableCell>
                              <div>
                                <div className="font-medium text-foreground">{invoice.id}</div>
                                <div className="text-sm text-muted-foreground">
                                  Issued: {new Date(invoice.issue_date).toLocaleDateString()}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src="/placeholder.svg" alt={invoice.student_name || `Student ${invoice.student_id}`} />
                                  <AvatarFallback>
                                    {(invoice.student_name || `Student ${invoice.student_id}`)
                                      .split(" ")
                                      .map((n) => n[0])
                                      .join("")}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-medium text-sm">{invoice.student_name || 'Unknown Student'}</div>
                                  {invoice.student_id && (
                                    <div className="text-xs text-muted-foreground">ID: {invoice.student_id}</div>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{invoice.course_name || 'N/A'}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">${(invoice.amount || 0).toLocaleString()}</div>
                              {invoice.status === "Partial" && invoice.paid_amount && (
                                <div className="text-xs text-muted-foreground">
                                  Paid: ${(invoice.paid_amount || 0).toLocaleString()}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">{new Date(invoice.due_date).toLocaleDateString()}</div>
                              {invoice.status === "Overdue" && (
                                <div className="text-xs text-destructive">
                                  {Math.ceil(
                                    (new Date().getTime() - new Date(invoice.due_date).getTime()) / (1000 * 3600 * 24),
                                  )}{" "}
                                  days overdue
                                </div>
                              )}
                            </TableCell>
                            <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                onClick={() => {
                                  setSelectedInvoice(invoice)
                                  setIsInvoiceDialogOpen(true)
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
                <CardDescription>Track all payment transactions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input 
                      placeholder="Search payments..." 
                      className="pl-10" 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Button variant="outline">Filter</Button>
                  <Button variant="outline">Export</Button>
                </div>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Payment ID</TableHead>
                        <TableHead>Invoice</TableHead>
                        <TableHead>Student</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Transaction ID</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPayments.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            {loading ? (
                              <div className="flex items-center justify-center">
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Loading...
                              </div>
                            ) : (
                              "No payments found"
                            )}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredPayments.map((payment, index) => (
                          <TableRow key={payment.id || `payment-${index}`}>
                            <TableCell>
                              <div className="font-medium text-foreground">{payment.id}</div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{payment.invoice_id}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium text-sm">{payment.student_name || 'Unknown Student'}</div>
                              {payment.student_id && (
                                <div className="text-xs text-muted-foreground">ID: {payment.student_id}</div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">${(payment.amount || 0).toLocaleString()}</div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <CreditCard className="mr-2 h-3 w-3 text-muted-foreground" />
                                {payment.method}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-mono text-xs">{payment.transaction_id}</div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">{new Date(payment.date).toLocaleDateString()}</div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="default" className="bg-chart-3 text-white">
                                <CheckCircle className="mr-1 h-3 w-3" />
                                {payment.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Invoice Details Dialog */}
      <InvoiceDetailsDialog
        invoice={selectedInvoice}
        isOpen={isInvoiceDialogOpen}
        onClose={() => {
          setIsInvoiceDialogOpen(false)
          setSelectedInvoice(null)
        }}
      />
    </>
  )
}
