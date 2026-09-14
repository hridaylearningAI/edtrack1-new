'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  RefreshCw, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle,
  Mail,
  Phone,
  Edit
} from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { useAuth } from "@clerk/nextjs"

interface EligibilityRecord {
  id: number
  course_id: number
  email: string
  name: string
  mobile: string
  region: string
  user_id: number | null
  eligibility_status: 'pending' | 'eligible' | 'not_eligible' | 'needs_review' | 'under_review'
  eligibility_data: {
    hasBachelorsDegree?: string
    qualificationInEnglish?: string
    under45Years?: string
    willingToAttemptEnglishTest?: string
    hasClinicalExperience?: string
    openToBridging?: string
    hasValidPassport?: string
    canCommitStudyTime?: string
    seekingInternationalCareer?: string
    willingToConsultMigration?: string
    additionalInfo?: string
  }
  notes: string | null
  checked_by: number | null
  checked_at: string | null
  created_at: string
  updated_at: string
  courses: {
    id: number
    name: string
  } | null
  users: {
    id: number
    name: string
    email: string
  } | null
}

export default function EligibilityPage() {
  const { getToken } = useAuth()
  const [eligibilityRecords, setEligibilityRecords] = useState<EligibilityRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRecord, setSelectedRecord] = useState<EligibilityRecord | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [newStatus, setNewStatus] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Fetch eligibility records
  const fetchEligibilityRecords = async () => {
    try {
      setLoading(true)
      
      // Get auth token
      let authToken = null
      try {
        if (getToken) {
          authToken = await getToken()
        }
        if (!authToken) {
          authToken = sessionStorage.getItem('clerk_auth_token')
        }
      } catch (error) {
        authToken = sessionStorage.getItem('clerk_auth_token')
      }

      const response = await fetch('/api/course-eligibility/admin', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
        },
      })
      
      const data = await response.json()

      if (data.success) {
        setEligibilityRecords(Array.isArray(data.data) ? data.data : [])
      } else {
        toast.error('Failed to fetch eligibility records')
      }
    } catch (error) {
      console.error('Error fetching eligibility records:', error)
      toast.error('Failed to fetch eligibility records')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEligibilityRecords()
  }, [])

  // Filter records by status
  const filteredRecords = statusFilter && statusFilter !== 'all'
    ? eligibilityRecords.filter(record => record.eligibility_status === statusFilter)
    : eligibilityRecords

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'eligible':
        return <Badge className="bg-success hover:bg-success"><CheckCircle2 className="h-3 w-3 mr-1" />Eligible</Badge>
      case 'not_eligible':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Not Eligible</Badge>
      case 'needs_review':
        return <Badge className="bg-warning hover:bg-warning"><AlertCircle className="h-3 w-3 mr-1" />Needs Review</Badge>
      case 'under_review':
        return <Badge className="bg-primary hover:bg-primary"><Clock className="h-3 w-3 mr-1" />Under Review</Badge>
      default:
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
    }
  }

  // Open edit dialog
  const handleEdit = (record: EligibilityRecord) => {
    setSelectedRecord(record)
    setNewStatus(record.eligibility_status)
    setNotes(record.notes || '')
    setIsDialogOpen(true)
  }

  // Update eligibility status
  const handleUpdate = async () => {
    if (!selectedRecord) return

    try {
      setIsUpdating(true)
      
      // Get auth token
      let authToken = null
      try {
        if (getToken) {
          authToken = await getToken()
        }
        if (!authToken) {
          authToken = sessionStorage.getItem('clerk_auth_token')
        }
      } catch (error) {
        authToken = sessionStorage.getItem('clerk_auth_token')
      }

      const response = await fetch(`/api/course-eligibility/${selectedRecord.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
        },
        body: JSON.stringify({
          eligibilityStatus: newStatus,
          notes: notes.trim() || null,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Eligibility status updated successfully')
        setIsDialogOpen(false)
        fetchEligibilityRecords()
      } else {
        toast.error(data.error || 'Failed to update eligibility status')
      }
    } catch (error) {
      console.error('Error updating eligibility:', error)
      toast.error('Failed to update eligibility status')
    } finally {
      setIsUpdating(false)
    }
  }

  // Get workflow answer display
  const getWorkflowAnswers = (record: EligibilityRecord) => {
    const data = record.eligibility_data || {}
    return [
      { label: "Bachelor's Degree in Nursing", value: data.hasBachelorsDegree === 'yes' ? 'Yes' : 'No' },
      { label: "Qualification taught in English", value: data.qualificationInEnglish === 'yes' ? 'Yes' : 'No' },
      { label: "Under 45 years of age", value: data.under45Years === 'yes' ? 'Yes' : 'No' },
      { label: "Willing to attempt IELTS/OET/PTE", value: data.willingToAttemptEnglishTest === 'yes' ? 'Yes' : 'No' },
      { label: "At least 1 year clinical experience", value: data.hasClinicalExperience === 'yes' ? 'Yes' : 'No' },
      { label: "Open to bridging/assessment steps", value: data.openToBridging === 'yes' ? 'Yes' : 'No' },
      { label: "Holds a valid passport", value: data.hasValidPassport === 'yes' ? 'Yes' : 'No' },
      { label: "Can commit weekly study time", value: data.canCommitStudyTime === 'yes' ? 'Yes' : 'No' },
      { label: "Seeking international career in 1-3 years", value: data.seekingInternationalCareer === 'yes' ? 'Yes' : 'No' },
      { label: "Willing to consult migration professional", value: data.willingToConsultMigration === 'yes' ? 'Yes' : 'No' },
    ]
  }

  return (
          <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div>
            <h2 className="text-2xl sm:text-3xl font-medium tracking-tight text-foreground">Eligibility Management</h2>
            <p className="text-muted-foreground mt-1 sm:mt-2">
              Review and manage eligibility checks for any course
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={fetchEligibilityRecords}
            disabled={loading}
          >
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
        </div>

        {/* NCLEX Card */}
        <Card>
          <CardHeader>
            <CardTitle>Course eligibility</CardTitle>
            <CardDescription>
              Manage eligibility checks across courses
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex items-center gap-4 mb-6">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="needs_review">Needs Review</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="eligible">Eligible</SelectItem>
                  <SelectItem value="not_eligible">Not Eligible</SelectItem>
                </SelectContent>
              </Select>
              <div className="text-sm text-muted-foreground">
                Total: {filteredRecords.length} record{filteredRecords.length !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Table */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No eligibility records found
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Mobile</TableHead>
                      <TableHead>Region</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            {record.email}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            {record.mobile}
                          </div>
                        </TableCell>
                        <TableCell>{record.region}</TableCell>
                        <TableCell>{getStatusBadge(record.eligibility_status)}</TableCell>
                        <TableCell>
                          {format(new Date(record.created_at), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(record)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            {record.eligibility_status === 'needs_review' ? 'Review' : 'Edit'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Review Eligibility</DialogTitle>
              <DialogDescription>
                Review eligibility details and update status
              </DialogDescription>
            </DialogHeader>

            {selectedRecord && (
              <div className="space-y-6">
                {/* User Information */}
                <div className="space-y-4">
                  <h3 className="font-semibold">User Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-muted-foreground">Name</label>
                      <p className="font-medium">{selectedRecord.name}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Email</label>
                      <p className="font-medium">{selectedRecord.email}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Mobile</label>
                      <p className="font-medium">{selectedRecord.mobile}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Region</label>
                      <p className="font-medium">{selectedRecord.region}</p>
                    </div>
                  </div>
                </div>

                {/* Workflow Answers */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Workflow Answers</h3>
                  <div className="rounded-md border p-4">
                    <div className="grid grid-cols-2 gap-4">
                      {getWorkflowAnswers(selectedRecord).map((answer, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">{answer.label}:</span>
                          <Badge variant={answer.value === 'Yes' ? 'default' : 'destructive'}>
                            {answer.value}
                          </Badge>
                        </div>
                      ))}
                    </div>
                    {selectedRecord.eligibility_data?.additionalInfo && (
                      <div className="mt-4 pt-4 border-t">
                        <label className="text-sm text-muted-foreground">Additional Information:</label>
                        <p className="mt-1 text-sm">{selectedRecord.eligibility_data.additionalInfo}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Current Status */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Current Status</h3>
                  <div>{getStatusBadge(selectedRecord.eligibility_status)}</div>
                  {selectedRecord.checked_at && (
                    <p className="text-sm text-muted-foreground">
                      Last reviewed: {format(new Date(selectedRecord.checked_at), 'MMM dd, yyyy HH:mm')}
                    </p>
                  )}
                </div>

                {/* Update Status */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Update Status</h3>
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="needs_review">Needs Review</SelectItem>
                      <SelectItem value="under_review">Under Review</SelectItem>
                      <SelectItem value="eligible">Eligible</SelectItem>
                      <SelectItem value="not_eligible">Not Eligible</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Notes */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Notes</h3>
                  <Textarea
                    placeholder="Add notes about this eligibility review..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                  />
                  {selectedRecord.notes && (
                    <div className="rounded-md border p-3 bg-muted">
                      <label className="text-sm text-muted-foreground">Previous Notes:</label>
                      <p className="mt-1 text-sm">{selectedRecord.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdate} disabled={isUpdating}>
                {isUpdating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Status'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
  )
}
