"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, Plus, MoreHorizontal, Percent, Calendar, Users, Edit, Trash2, Copy, Loader2, AlertCircle } from "lucide-react"
import { useDiscounts } from "@/lib/hooks/useDiscounts"
import { DiscountDialog } from "@/components/admin/discount-dialog"
import { Discount, DiscountCreate, DiscountUpdate } from "@/lib/api"
import { useState, useCallback } from "react"
import { toast } from "sonner"

const getStatusBadge = (status: string) => {
  switch (status?.toLowerCase()) {
    case "active":
      return (
        <Badge variant="default" className="border-success-line bg-success-soft text-success">
          Active
        </Badge>
      )
    case "inactive":
      return <Badge variant="secondary">Inactive</Badge>
    case "expired":
      return <Badge variant="outline">Expired</Badge>
    case "scheduled":
      return (
        <Badge variant="default" className="border-primary-line bg-primary-soft text-primary">
          Scheduled
        </Badge>
      )
    default:
      return <Badge variant="outline">{status || 'Unknown'}</Badge>
  }
}

const getTypeColor = (type: string) => {
  return type === "percentage" ? "text-primary" : "text-success"
}

const getDiscountValue = (discount: Discount) => {
  switch (discount.discount_type) {
    case 'percentage':
      return `${discount.discount_value}%`
    case 'fixed_amount':
      return `$${discount.discount_value}`
    case 'free_course':
      return 'Free Course'
    default:
      return `${discount.discount_value}`
  }
}

const getApplicableCourses = (discount: Discount) => {
  if (!discount.course_ids || discount.course_ids.length === 0) {
    return "All Courses"
  }
  
  // If we have course names in the discount object, show them
  if (discount.courses && Array.isArray(discount.courses)) {
    const courseNames = discount.courses.map((course: any) => course.name).join(', ')
    return courseNames.length > 50 ? `${courseNames.substring(0, 50)}...` : courseNames
  }
  
  return `${discount.course_ids.length} course${discount.course_ids.length > 1 ? 's' : ''}`
}

export default function DiscountsPage() {
  const {
    discounts,
    loading,
    error,
    fetchDiscounts,
    createDiscount,
    updateDiscount,
    deleteDiscount,
    searchDiscounts,
    clearError,
  } = useDiscounts()

  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [selectedDiscount, setSelectedDiscount] = useState<Discount | null>(null)

  const handleSearch = useCallback(() => {
    const params: any = {}
    if (searchTerm) params.name = searchTerm
    if (statusFilter !== "all") params.status = statusFilter
    if (typeFilter !== "all") params.discount_type = typeFilter
    
    if (Object.keys(params).length > 0) {
      searchDiscounts(params)
    } else {
      fetchDiscounts()
    }
  }, [searchTerm, statusFilter, typeFilter, searchDiscounts, fetchDiscounts])

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const handleDiscountCreated = useCallback(async (data: DiscountCreate | DiscountUpdate) => {
    try {
      if ('name' in data && data.name) {
        await createDiscount(data as DiscountCreate)
        // Clear any active filters to show the new discount
        setSearchTerm('')
        setStatusFilter('all')
        setTypeFilter('all')
      }
    } catch (error) {
      console.error('Failed to create discount:', error)
    }
  }, [createDiscount])

  const handleDiscountUpdated = useCallback(async (data: DiscountUpdate) => {
    if (!selectedDiscount) return
    
    try {
      await updateDiscount(selectedDiscount.id, data)
      setSelectedDiscount(null)
    } catch (error) {
      console.error('Failed to update discount:', error)
    }
  }, [selectedDiscount, updateDiscount])

  const handleDiscountDeleted = useCallback(async (discountId: number) => {
    if (confirm('Are you sure you want to delete this discount? This action cannot be undone.')) {
      try {
        await deleteDiscount(discountId)
      } catch (error) {
        console.error('Failed to delete discount:', error)
      }
    }
  }, [deleteDiscount])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  // Clear error when component unmounts or error changes (but don't show toast for table missing errors)
  if (error && !error.includes('does not exist') && !error.includes('relation "discounts"')) {
    toast.error(error)
    clearError()
  }

  const activeDiscounts = discounts.filter(d => d.status?.toLowerCase() === 'active').length
  const totalSavings = discounts.reduce((acc, d) => {
    if (d.discount_type === 'percentage') {
      // Estimate savings for percentage discounts (assuming average course price of $1000)
      return acc + (d.usage_count || 0) * 1000 * (d.discount_value / 100)
    } else {
      return acc + (d.usage_count || 0) * d.discount_value
    }
  }, 0)

  return (
          <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-medium tracking-tight text-foreground">Discount Management</h2>
            <p className="text-muted-foreground mt-2">Create and manage discount codes for courses</p>
          </div>
          <DiscountDialog onSubmit={handleDiscountCreated} />
        </div>

        {/* Discount Statistics */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-medium tracking-tight text-foreground">{discounts.length}</div>
                  <p className="text-xs text-muted-foreground">Total Discounts</p>
                </div>
                <Percent className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-medium tracking-tight text-foreground">{activeDiscounts}</div>
                  <p className="text-xs text-muted-foreground">Active Discounts</p>
                </div>
                <Calendar className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-medium tracking-tight text-foreground">
                    {discounts.reduce((acc, d) => acc + (d.usage_count || 0), 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">Total Uses</p>
                </div>
                <Users className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-medium tracking-tight text-foreground">${totalSavings.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">Total Savings</p>
                </div>
                <Percent className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Error Message if table doesn't exist */}
        {error && (error.includes('does not exist') || error.includes('relation "discounts"')) && (
          <Card className="border-warning bg-warning-soft">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <AlertCircle className="h-6 w-6 text-warning mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-warning mb-2">
                    Discounts Table Not Found
                  </h3>
                  <p className="text-sm text-warning mb-4">
                    The discounts table does not exist in the database. Please create the table first before managing discounts.
                  </p>
                  <p className="text-xs text-warning">
                    You can create the table by running the appropriate database migration script.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Discounts Table */}
        <Card>
          <CardHeader>
            <CardTitle>Discount Codes</CardTitle>
            <CardDescription>Manage all discount codes and their usage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input 
                  placeholder="Search discounts..." 
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={handleSearchKeyPress}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="fixed_amount">Fixed Amount</SelectItem>
                  <SelectItem value="free_course">Free Course</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                variant="outline" 
                className="flex-1 sm:flex-none bg-transparent"
                onClick={handleSearch}
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Search
              </Button>
              <Button 
                variant="outline" 
                className="flex-1 sm:flex-none bg-transparent"
                onClick={() => {
                  setSearchTerm('')
                  setStatusFilter('all')
                  setTypeFilter('all')
                  fetchDiscounts()
                }}
                disabled={loading}
              >
                Clear
              </Button>
            </div>

            <div className="rounded-md border">
              {loading && discounts.length === 0 ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Loading discounts...</span>
                </div>
              ) : discounts.length === 0 ? (
                <div className="flex items-center justify-center p-8">
                  <AlertCircle className="h-8 w-8 text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">No discounts found</span>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Discount</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Type & Value</TableHead>
                      <TableHead>Applicable Courses</TableHead>
                      <TableHead>Valid Period</TableHead>
                      <TableHead>Usage</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {discounts.map((discount) => (
                      <TableRow key={discount.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium text-foreground">{discount.name}</div>
                            <div className="text-sm text-muted-foreground">{discount.description}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="font-mono">
                              {discount.coupon_code || 'N/A'}
                            </Badge>
                            {discount.coupon_code && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-6 w-6 p-0"
                                onClick={() => copyToClipboard(discount.coupon_code!)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className={`font-medium ${getTypeColor(discount.discount_type)}`}>
                            {getDiscountValue(discount)}
                          </div>
                          <div className="text-xs text-muted-foreground capitalize">
                            {discount.discount_type.replace('_', ' ')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {getApplicableCourses(discount)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{discount.start_date ? new Date(discount.start_date).toLocaleDateString() : 'No start date'}</div>
                            <div className="text-muted-foreground">
                              to {discount.end_date ? new Date(discount.end_date).toLocaleDateString() : 'No end date'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-center">
                            <div className="font-medium">
                              {discount.usage_count || 0}
                              {discount.usage_limit && ` / ${discount.usage_limit}`}
                            </div>
                            {discount.usage_limit && (
                              <div className="w-full bg-muted rounded-full h-1 mt-1">
                                <div
                                  className="h-1 rounded-full bg-success"
                                  style={{ width: `${((discount.usage_count || 0) / discount.usage_limit) * 100}%` }}
                                />
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(discount.status || 'active')}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                          <DropdownMenuItem onClick={() => setSelectedDiscount(discount)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Discount
                            </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Copy className="mr-2 h-4 w-4" />
                                Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => handleDiscountDeleted(discount.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Discount
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Edit Discount Dialog */}
        {selectedDiscount && (
          <DiscountDialog
            discount={selectedDiscount}
            onSubmit={handleDiscountUpdated}
            trigger={<div style={{ display: 'none' }} />}
          />
        )}
      </div>
  )
}
