'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, RefreshCw, ShoppingCart, UserCheck, UserX } from 'lucide-react'
import { toast } from 'sonner'
import { jsPDF } from 'jspdf'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type CartItemSummary = {
  cart_item_id: number
  course_id: number
  course_name: string
  quantity: number
  total_price: number
}

type UserEnrollmentSummary = {
  id: number
  name: string | null
  email: string | null
  role: string | null
  created_at: string | null
  enrollment_count: number
  latest_enrollment_at: string | null
  enrolled_course_ids: number[]
  enrolled_course_names: string[]
}

type NonEnrolledUserSummary = UserEnrollmentSummary & {
  active_cart_id: number | null
  active_cart_total: number
  cart_items: CartItemSummary[]
}

type EnrollmentOverviewResponse = {
  enrolledUsers: UserEnrollmentSummary[]
  notEnrolledUsers: NonEnrolledUserSummary[]
}

export default function EnrollmentOverviewPage() {
  const { getToken } = useAuth()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<EnrollmentOverviewResponse>({ enrolledUsers: [], notEnrolledUsers: [] })
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<'enrolled' | 'not-enrolled'>('enrolled')
  const [enrolledCountFilter, setEnrolledCountFilter] = useState<'all' | '1-2' | '3+'>('all')
  const [enrolledRecentFilter, setEnrolledRecentFilter] = useState<'all' | '30' | '90'>('all')
  const [enrolledAccountCreatedFilter, setEnrolledAccountCreatedFilter] = useState<'all' | '30' | '90' | '180'>('all')
  const [enrolledCourseFilter, setEnrolledCourseFilter] = useState<string>('all')
  const [notEnrolledCartFilter, setNotEnrolledCartFilter] = useState<'all' | 'with-cart' | 'no-cart'>('all')
  const [notEnrolledCartValueFilter, setNotEnrolledCartValueFilter] = useState<'all' | '0' | '0-500' | '500+'>('all')
  const [notEnrolledAccountCreatedFilter, setNotEnrolledAccountCreatedFilter] = useState<'all' | '30' | '90' | '180'>('all')
  const [notEnrolledCourseFilter, setNotEnrolledCourseFilter] = useState<string>('all')
  const [specificExportOpen, setSpecificExportOpen] = useState(false)
  const [specificExportFormat, setSpecificExportFormat] = useState<'csv' | 'pdf'>('csv')
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([])

  const fetchOverview = async () => {
    try {
      setLoading(true)
      let authToken: string | null = null
      try {
        if (getToken) authToken = await getToken()
        if (!authToken) authToken = sessionStorage.getItem('clerk_auth_token')
      } catch {
        authToken = sessionStorage.getItem('clerk_auth_token')
      }

      const response = await fetch('/api/admin/enrollment-overview', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken && { Authorization: `Bearer ${authToken}` }),
        },
      })
      const json = await response.json()
      if (!response.ok || !json?.success) {
        toast.error(json?.error || json?.message || 'Failed to fetch enrollment overview')
        setData({ enrolledUsers: [], notEnrolledUsers: [] })
        return
      }
      setData(json.data ?? { enrolledUsers: [], notEnrolledUsers: [] })
    } catch (err) {
      console.error('Failed to fetch enrollment overview:', err)
      toast.error('Failed to fetch enrollment overview')
      setData({ enrolledUsers: [], notEnrolledUsers: [] })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOverview()
  }, [])

  const withinDays = (value: string | null, days: number) => {
    if (!value) return false
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return false
    const diffMs = Date.now() - date.getTime()
    return diffMs <= days * 24 * 60 * 60 * 1000
  }

  const enrolledCourseOptions = useMemo(() => {
    const map = new Map<number, string>()
    data.enrolledUsers.forEach((u) => {
      u.enrolled_course_ids.forEach((id, idx) => {
        if (!map.has(id)) map.set(id, u.enrolled_course_names[idx] || `Course #${id}`)
      })
    })
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [data.enrolledUsers])

  const filteredEnrolledUsers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    return data.enrolledUsers.filter((u) => {
      if (q && !`${u.name || ''} ${u.email || ''}`.toLowerCase().includes(q)) return false
      if (enrolledCountFilter === '1-2' && !(u.enrollment_count >= 1 && u.enrollment_count <= 2)) return false
      if (enrolledCountFilter === '3+' && !(u.enrollment_count >= 3)) return false
      if (enrolledRecentFilter !== 'all' && !withinDays(u.latest_enrollment_at, Number(enrolledRecentFilter))) return false
      if (enrolledAccountCreatedFilter !== 'all' && !withinDays(u.created_at, Number(enrolledAccountCreatedFilter))) return false
      if (enrolledCourseFilter !== 'all' && !u.enrolled_course_ids.includes(Number(enrolledCourseFilter))) return false
      return true
    })
  }, [data.enrolledUsers, searchTerm, enrolledCountFilter, enrolledRecentFilter, enrolledAccountCreatedFilter, enrolledCourseFilter])

  const filteredNotEnrolledUsers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    return data.notEnrolledUsers.filter((u) => {
      if (q && !`${u.name || ''} ${u.email || ''}`.toLowerCase().includes(q)) return false
      if (notEnrolledCartFilter === 'with-cart' && u.cart_items.length === 0) return false
      if (notEnrolledCartFilter === 'no-cart' && u.cart_items.length > 0) return false
      if (notEnrolledCartValueFilter === '0' && u.active_cart_total !== 0) return false
      if (notEnrolledCartValueFilter === '0-500' && !(u.active_cart_total > 0 && u.active_cart_total < 500)) return false
      if (notEnrolledCartValueFilter === '500+' && !(u.active_cart_total >= 500)) return false
      if (
        notEnrolledCourseFilter !== 'all' &&
        !u.cart_items.some((item) => item.course_id === Number(notEnrolledCourseFilter))
      ) return false
      if (notEnrolledAccountCreatedFilter !== 'all' && !withinDays(u.created_at, Number(notEnrolledAccountCreatedFilter))) return false
      return true
    })
  }, [data.notEnrolledUsers, searchTerm, notEnrolledCartFilter, notEnrolledCartValueFilter, notEnrolledCourseFilter, notEnrolledAccountCreatedFilter])

  const notEnrolledCourseOptions = useMemo(() => {
    const map = new Map<number, string>()
    data.notEnrolledUsers.forEach((u) => {
      u.cart_items.forEach((item) => {
        if (!map.has(item.course_id)) map.set(item.course_id, item.course_name || `Course #${item.course_id}`)
      })
    })
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [data.notEnrolledUsers])

  const formatDate = (value: string | null) => {
    if (!value) return '—'
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleDateString()
  }

  const downloadCsv = (filename: string, rows: string[][]) => {
    const escapeCell = (value: string) => {
      const normalized = (value ?? '').replace(/"/g, '""')
      return /[",\n]/.test(normalized) ? `"${normalized}"` : normalized
    }
    const csv = rows.map((row) => row.map(escapeCell).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const currentTabUsers = useMemo(
    () => (activeTab === 'enrolled' ? filteredEnrolledUsers : filteredNotEnrolledUsers),
    [activeTab, filteredEnrolledUsers, filteredNotEnrolledUsers]
  )

  const exportCurrentTabCsv = (mode: 'all' | 'specific' = 'all', specificIds: number[] = []) => {

    if (activeTab === 'enrolled') {
      const exportUsers = mode === 'specific'
        ? filteredEnrolledUsers.filter((u) => specificIds.includes(u.id))
        : filteredEnrolledUsers
      if (exportUsers.length === 0) {
        toast.error('No matching enrolled students found for export.')
        return
      }
      const rows: string[][] = [
        ['Name', 'Email', 'Enrollments', 'Latest Enrollment', 'Account Created'],
        ...exportUsers.map((u) => [
          u.name || '—',
          u.email || '—',
          String(u.enrollment_count),
          formatDate(u.latest_enrollment_at),
          formatDate(u.created_at),
        ]),
      ]
      downloadCsv('enrolled-users.csv', rows)
      toast.success(`CSV exported for ${mode === 'specific' ? 'selected' : 'all'} enrolled users`)
      return
    }
    const exportUsers = mode === 'specific'
      ? filteredNotEnrolledUsers.filter((u) => specificIds.includes(u.id))
      : filteredNotEnrolledUsers
    if (exportUsers.length === 0) {
      toast.error('No matching non-enrolled students found for export.')
      return
    }
    const rows: string[][] = [
      ['Name', 'Email', 'Cart Items', 'Cart Total', 'Cart Contents', 'Account Created'],
      ...exportUsers.map((u) => [
        u.name || '—',
        u.email || '—',
        String(u.cart_items.length),
        u.active_cart_total.toFixed(2),
        u.cart_items.length === 0
          ? 'No active cart items'
          : u.cart_items.map((item) => `${item.course_name} x${item.quantity} ($${item.total_price.toFixed(2)})`).join(' | '),
        formatDate(u.created_at),
      ]),
    ]
    downloadCsv('not-enrolled-users.csv', rows)
    toast.success(`CSV exported for ${mode === 'specific' ? 'selected' : 'all'} non-enrolled users`)
  }

  const exportCurrentTabPdf = (mode: 'all' | 'specific' = 'all', specificIds: number[] = []) => {
    const enrolledExportUsers =
      mode === 'specific'
        ? filteredEnrolledUsers.filter((u) => specificIds.includes(u.id))
        : filteredEnrolledUsers
    const notEnrolledExportUsers =
      mode === 'specific'
        ? filteredNotEnrolledUsers.filter((u) => specificIds.includes(u.id))
        : filteredNotEnrolledUsers

    const doc = new jsPDF({ orientation: 'landscape' })
    const margin = 10
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const rowHeight = 8
    let y = 22

    const addHeader = (title: string, rowCount: number) => {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(14)
      doc.text(title, margin, 12)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.text(`Rows: ${rowCount}`, pageWidth - margin - 25, 12)
    }

    const ensureSpaceForRow = () => {
      if (y + rowHeight > pageHeight - margin) {
        doc.addPage()
        y = 22
      }
    }

    const drawTableHeader = (columns: { label: string; width: number }[]) => {
      let x = margin
      doc.setFillColor(239, 246, 255)
      doc.rect(margin, y - 6, columns.reduce((sum, c) => sum + c.width, 0), rowHeight, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      columns.forEach((col) => {
        doc.text(col.label, x + 1, y)
        x += col.width
      })
      y += rowHeight
      doc.setFont('helvetica', 'normal')
    }

    const drawTableRow = (columns: { value: string; width: number }[]) => {
      ensureSpaceForRow()
      let x = margin
      doc.setFontSize(8.5)
      columns.forEach((col) => {
        const lines = doc.splitTextToSize(col.value || '—', col.width - 2)
        doc.text(lines[0] || '—', x + 1, y)
        x += col.width
      })
      y += rowHeight
    }

    if (activeTab === 'enrolled') {
      if (enrolledExportUsers.length === 0) {
        toast.error('No matching enrolled students found for export.')
        return
      }
      addHeader('Enrollment Overview - Enrolled Users', enrolledExportUsers.length)
      const headerCols = [
        { label: 'Name', width: 70 },
        { label: 'Email', width: 95 },
        { label: 'Enrollments', width: 35 },
        { label: 'Latest Enrollment', width: 45 },
        { label: 'Account Created', width: 45 },
      ]
      drawTableHeader(headerCols)
      enrolledExportUsers.forEach((u) => {
        drawTableRow([
          { value: u.name || '—', width: 70 },
          { value: u.email || '—', width: 95 },
          { value: String(u.enrollment_count), width: 35 },
          { value: formatDate(u.latest_enrollment_at), width: 45 },
          { value: formatDate(u.created_at), width: 45 },
        ])
      })
      doc.save('enrolled-users.pdf')
      toast.success(`PDF exported for ${mode === 'specific' ? 'selected' : 'all'} enrolled users`)
      return
    }

    if (notEnrolledExportUsers.length === 0) {
      toast.error('No matching non-enrolled students found for export.')
      return
    }
    addHeader('Enrollment Overview - Not Enrolled Users', notEnrolledExportUsers.length)
    const headerCols = [
      { label: 'Name', width: 50 },
      { label: 'Email', width: 70 },
      { label: 'Cart Items', width: 25 },
      { label: 'Cart Total', width: 30 },
      { label: 'Cart Contents', width: 90 },
      { label: 'Account Created', width: 35 },
    ]
    drawTableHeader(headerCols)
    notEnrolledExportUsers.forEach((u) => {
      drawTableRow([
        { value: u.name || '—', width: 50 },
        { value: u.email || '—', width: 70 },
        { value: String(u.cart_items.length), width: 25 },
        { value: `$${u.active_cart_total.toFixed(2)}`, width: 30 },
        {
          value:
            u.cart_items.length === 0
              ? 'No active cart items'
              : u.cart_items
                  .map((item) => `${item.course_name} x${item.quantity} ($${item.total_price.toFixed(2)})`)
                  .join(' | '),
          width: 90,
        },
        { value: formatDate(u.created_at), width: 35 },
      ])
    })
    doc.save('not-enrolled-users.pdf')
    toast.success(`PDF exported for ${mode === 'specific' ? 'selected' : 'all'} non-enrolled users`)
  }

  const openSpecificExportDialog = (format: 'csv' | 'pdf') => {
    setSpecificExportFormat(format)
    setSelectedStudentIds([])
    setSpecificExportOpen(true)
  }

  const toggleSpecificStudent = (id: number) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const handleSpecificExportConfirm = () => {
    if (selectedStudentIds.length === 0) {
      toast.error('Please select at least one student.')
      return
    }
    if (specificExportFormat === 'csv') {
      exportCurrentTabCsv('specific', selectedStudentIds)
    } else {
      exportCurrentTabPdf('specific', selectedStudentIds)
    }
    setSpecificExportOpen(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Enrollment Overview</h2>
          <p className="text-muted-foreground mt-1">
            Students split by enrolled vs not enrolled, with cart visibility for non-enrolled users.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name or email"
            className="w-72"
          />
          <Button variant="outline" onClick={fetchOverview} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </>
            )}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={loading}>
                Export CSV
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => exportCurrentTabCsv('all')}>
                Export entire list
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openSpecificExportDialog('csv')}>
                Export specific students
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={loading}>
                Export PDF
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => exportCurrentTabPdf('all')}>
                Export entire list
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openSpecificExportDialog('pdf')}>
                Export specific students
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">{data.enrolledUsers.length}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <UserCheck className="h-3 w-3" /> Enrolled users
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">{data.notEnrolledUsers.length}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <UserX className="h-3 w-3" /> Not enrolled users
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">
              {data.notEnrolledUsers.filter((u) => u.cart_items.length > 0).length}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <ShoppingCart className="h-3 w-3" /> Not-enrolled users with cart items
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'enrolled' | 'not-enrolled')}>
        <TabsList>
          <TabsTrigger value="enrolled">Users Enrolled In Any Course</TabsTrigger>
          <TabsTrigger value="not-enrolled">Users Not Enrolled In Any Course</TabsTrigger>
        </TabsList>

        <TabsContent value="enrolled" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Enrolled Users Filters</CardTitle>
              <CardDescription>Filters only for users who have at least one enrollment.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Enrollment count</p>
                  <select
                    value={enrolledCountFilter}
                    onChange={(e) => setEnrolledCountFilter(e.target.value as 'all' | '1-2' | '3+')}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="all">All</option>
                    <option value="1-2">1-2 enrollments</option>
                    <option value="3+">3+ enrollments</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Course</p>
                  <select
                    value={enrolledCourseFilter}
                    onChange={(e) => setEnrolledCourseFilter(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="all">All courses</option>
                    {enrolledCourseOptions.map((c) => (
                      <option key={c.id} value={String(c.id)}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Latest enrollment</p>
                  <select
                    value={enrolledRecentFilter}
                    onChange={(e) => setEnrolledRecentFilter(e.target.value as 'all' | '30' | '90')}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="all">Any time</option>
                    <option value="30">Last 30 days</option>
                    <option value="90">Last 90 days</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Account created within</p>
                  <select
                    value={enrolledAccountCreatedFilter}
                    onChange={(e) => setEnrolledAccountCreatedFilter(e.target.value as 'all' | '30' | '90' | '180')}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="all">All time</option>
                    <option value="30">Last 30 days</option>
                    <option value="90">Last 90 days</option>
                    <option value="180">Last 180 days</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setEnrolledCountFilter('all')
                      setEnrolledRecentFilter('all')
                      setEnrolledAccountCreatedFilter('all')
                      setEnrolledCourseFilter('all')
                    }}
                  >
                    Clear enrolled filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Users Enrolled In Any Course</CardTitle>
              <CardDescription>Users with at least one enrollment record.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Enrollments</TableHead>
                      <TableHead>Courses</TableHead>
                      <TableHead>Latest Enrollment</TableHead>
                      <TableHead>Account Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEnrolledUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          {loading ? 'Loading...' : 'No enrolled users found.'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredEnrolledUsers.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">{u.name || '—'}</TableCell>
                          <TableCell>{u.email || '—'}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{u.enrollment_count}</Badge>
                          </TableCell>
                          <TableCell className="max-w-[300px]">
                            {u.enrolled_course_names.length === 0 ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {u.enrolled_course_names.map((name) => (
                                  <Badge key={`${u.id}-${name}`} variant="secondary" className="max-w-[260px] truncate">
                                    {name}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>{formatDate(u.latest_enrollment_at)}</TableCell>
                          <TableCell>{formatDate(u.created_at)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="not-enrolled" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Not Enrolled Users Filters</CardTitle>
              <CardDescription>Filters only for users with zero enrollments.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Cart status</p>
                  <select
                    value={notEnrolledCartFilter}
                    onChange={(e) => setNotEnrolledCartFilter(e.target.value as 'all' | 'with-cart' | 'no-cart')}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="all">All</option>
                    <option value="with-cart">With cart items</option>
                    <option value="no-cart">No cart items</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Cart total</p>
                  <select
                    value={notEnrolledCartValueFilter}
                    onChange={(e) => setNotEnrolledCartValueFilter(e.target.value as 'all' | '0' | '0-500' | '500+')}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="all">All totals</option>
                    <option value="0">$0 only</option>
                    <option value="0-500">$0.01 - $499.99</option>
                    <option value="500+">$500+</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Account created within</p>
                  <select
                    value={notEnrolledAccountCreatedFilter}
                    onChange={(e) => setNotEnrolledAccountCreatedFilter(e.target.value as 'all' | '30' | '90' | '180')}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="all">All time</option>
                    <option value="30">Last 30 days</option>
                    <option value="90">Last 90 days</option>
                    <option value="180">Last 180 days</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Course (in cart)</p>
                  <select
                    value={notEnrolledCourseFilter}
                    onChange={(e) => setNotEnrolledCourseFilter(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="all">All courses</option>
                    {notEnrolledCourseOptions.map((c) => (
                      <option key={c.id} value={String(c.id)}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setNotEnrolledCartFilter('all')
                      setNotEnrolledCartValueFilter('all')
                      setNotEnrolledAccountCreatedFilter('all')
                      setNotEnrolledCourseFilter('all')
                    }}
                  >
                    Clear not-enrolled filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Users Not Enrolled In Any Course</CardTitle>
              <CardDescription>
                Users without enrollments. Includes active cart items for quick follow-up.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Cart Items</TableHead>
                      <TableHead>Cart Total</TableHead>
                      <TableHead>Cart Contents</TableHead>
                      <TableHead>Account Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredNotEnrolledUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          {loading ? 'Loading...' : 'No non-enrolled users found.'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredNotEnrolledUsers.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">{u.name || '—'}</TableCell>
                          <TableCell>{u.email || '—'}</TableCell>
                          <TableCell>
                            <Badge variant={u.cart_items.length > 0 ? 'default' : 'secondary'}>
                              {u.cart_items.length}
                            </Badge>
                          </TableCell>
                          <TableCell>${u.active_cart_total.toFixed(2)}</TableCell>
                          <TableCell className="max-w-[420px]">
                            {u.cart_items.length === 0 ? (
                              <span className="text-muted-foreground">No active cart items</span>
                            ) : (
                              <div className="space-y-1">
                                {u.cart_items.map((item) => (
                                  <div key={item.cart_item_id} className="text-xs">
                                    {item.course_name} x{item.quantity} (${item.total_price.toFixed(2)})
                                  </div>
                                ))}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>{formatDate(u.created_at)}</TableCell>
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

      {specificExportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-xl border bg-background shadow-lg">
            <div className="border-b px-4 py-3">
              <h3 className="text-lg font-semibold">Select students to export</h3>
              <p className="text-sm text-muted-foreground">
                Choose one or more students from the current tab list.
              </p>
            </div>
            <div className="max-h-[55vh] overflow-y-auto px-4 py-3 space-y-2">
              {currentTabUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No users available in current view.</p>
              ) : (
                currentTabUsers.map((u) => (
                  <label
                    key={`export-${u.id}`}
                    className="flex items-center gap-3 rounded-md border px-3 py-2 cursor-pointer hover:bg-muted/40"
                  >
                    <input
                      type="checkbox"
                      checked={selectedStudentIds.includes(u.id)}
                      onChange={() => toggleSpecificStudent(u.id)}
                      className="h-4 w-4"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{u.name || '—'}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email || '—'}</p>
                    </div>
                  </label>
                ))
              )}
            </div>
            <div className="border-t px-4 py-3 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Selected: {selectedStudentIds.length}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setSelectedStudentIds(currentTabUsers.map((u) => u.id))}>
                  Select all
                </Button>
                <Button variant="outline" onClick={() => setSelectedStudentIds([])}>
                  Clear
                </Button>
                <Button variant="outline" onClick={() => setSpecificExportOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSpecificExportConfirm}>
                  Export {specificExportFormat.toUpperCase()}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
