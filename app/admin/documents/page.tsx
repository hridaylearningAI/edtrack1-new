"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Search,
  FileText,
  Download,
  Eye,
  Check,
  X,
  Clock,
  MoreHorizontal,
  Filter,
  AlertCircle,
  Loader2,
} from "lucide-react"
import { useDocuments } from "@/lib/hooks/useDocuments"
import { DocumentUploadDialog } from "@/components/admin/document-upload-dialog"
import { DocumentPreviewDialog } from "@/components/admin/document-preview-dialog"
import { useState, useCallback } from "react"
import { Document } from "@/lib/api"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const documentTypes = [
  { name: "Passport", required: true, description: "Valid passport for identification" },
  { name: "Visa", required: true, description: "Student visa or work permit" },
  { name: "Academic Transcript", required: true, description: "Official academic records" },
  { name: "Driver's License", required: false, description: "Government-issued ID" },
  { name: "Birth Certificate", required: false, description: "Official birth certificate" },
  { name: "Medical Certificate", required: false, description: "Health clearance certificate" },
]

const getStatusBadge = (status: string) => {
  switch (status.toLowerCase()) {
    case "verified":
      return (
        <Badge variant="default" className="bg-chart-3 text-white">
          <Check className="mr-1 h-3 w-3" />
          Verified
        </Badge>
      )
    case "pending":
      return (
        <Badge variant="secondary">
          <Clock className="mr-1 h-3 w-3" />
          Pending
        </Badge>
      )
    case "rejected":
      return (
        <Badge variant="destructive">
          <X className="mr-1 h-3 w-3" />
          Rejected
        </Badge>
      )
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

const getDocumentIcon = (type: string) => {
  return <FileText className="h-4 w-4 text-chart-1" />
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const getDocumentTypeLabel = (type: string) => {
  const typeMap: Record<string, string> = {
    passport: 'Passport',
    visa: 'Visa',
    academic_transcript: 'Academic Transcript',
    drivers_license: 'Driver\'s License',
    birth_certificate: 'Birth Certificate',
    medical_certificate: 'Medical Certificate',
    other: 'Other'
  }
  return typeMap[type] || type
}

export default function DocumentsPage() {
  const {
    documents,
    loading,
    error,
    total,
    fetchDocuments,
    downloadDocument,
    deleteDocument
  } = useDocuments()

  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [documentTypeFilter, setDocumentTypeFilter] = useState<string>("all")

  const handleDocumentUploaded = useCallback(() => {
    fetchDocuments()
  }, [fetchDocuments])

  const handleDocumentVerified = useCallback(() => {
    fetchDocuments()
  }, [fetchDocuments])

  const handleDownload = useCallback(async (documentId: number) => {
    try {
      await downloadDocument(documentId)
    } catch (error) {
      console.error('Download failed:', error)
    }
  }, [downloadDocument])

  const handleDelete = useCallback(async (documentId: number) => {
    if (confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      try {
        await deleteDocument(documentId)
      } catch (error) {
        console.error('Delete failed:', error)
      }
    }
  }, [deleteDocument])

  // Filter documents based on search and filters
  const filteredDocuments = (documents || []).filter((doc) => {
    const matchesSearch = searchTerm === "" || 
      doc.original_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.student_name && doc.student_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      getDocumentTypeLabel(doc.document_type).toLowerCase().includes(searchTerm.toLowerCase()) ||
      `student ${doc.student_id}`.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === "all" || doc.status.toLowerCase() === statusFilter.toLowerCase()
    const matchesType = documentTypeFilter === "all" || doc.document_type === documentTypeFilter
    
    return matchesSearch && matchesStatus && matchesType
  })

  const pendingCount = (documents || []).filter((d) => d.status.toLowerCase() === "pending").length
  const verifiedCount = (documents || []).filter((d) => d.status.toLowerCase() === "verified").length
  const rejectedCount = (documents || []).filter((d) => d.status.toLowerCase() === "rejected").length

  if (loading && (documents || []).length === 0) {
    return (
              <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading documents...</span>
        </div>
    )
  }

  if (error && documents.length === 0) {
    return (
              <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
            <p className="text-destructive">Error loading documents: {error}</p>
            <Button onClick={() => fetchDocuments()} className="mt-2">
              Try Again
            </Button>
          </div>
        </div>
    )
  }

  return (
          <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-foreground">Documents</h2>
            <p className="text-muted-foreground mt-2">Manage student documents and verification process</p>
          </div>
          <DocumentUploadDialog onDocumentUploaded={handleDocumentUploaded} />
        </div>

        {/* Document Statistics */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-foreground">{total}</div>
                  <p className="text-xs text-muted-foreground">Total Documents</p>
                </div>
                <FileText className="h-8 w-8 text-chart-1" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-foreground">{pendingCount}</div>
                  <p className="text-xs text-muted-foreground">Pending Review</p>
                </div>
                <Clock className="h-8 w-8 text-chart-4" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-foreground">{verifiedCount}</div>
                  <p className="text-xs text-muted-foreground">Verified</p>
                </div>
                <Check className="h-8 w-8 text-chart-3" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-foreground">{rejectedCount}</div>
                  <p className="text-xs text-muted-foreground">Rejected</p>
                </div>
                <AlertCircle className="h-8 w-8 text-chart-2" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Document Management */}
        <Tabs defaultValue="all-documents" className="space-y-6">
          <TabsList>
            <TabsTrigger value="all-documents">All Documents</TabsTrigger>
            <TabsTrigger value="document-types">Document Types</TabsTrigger>
          </TabsList>

          <TabsContent value="all-documents" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Document Management</CardTitle>
                <CardDescription>Review and manage all student documents</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input 
                      placeholder="Search documents..." 
                      className="pl-10"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="verified">Verified</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={documentTypeFilter} onValueChange={setDocumentTypeFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="passport">Passport</SelectItem>
                      <SelectItem value="visa">Visa</SelectItem>
                      <SelectItem value="academic_transcript">Academic Transcript</SelectItem>
                      <SelectItem value="drivers_license">Driver's License</SelectItem>
                      <SelectItem value="birth_certificate">Birth Certificate</SelectItem>
                      <SelectItem value="medical_certificate">Medical Certificate</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={() => {
                    setSearchTerm("")
                    setStatusFilter("all")
                    setDocumentTypeFilter("all")
                  }}>
                    Clear Filters
                  </Button>
                </div>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Document Type</TableHead>
                        <TableHead>File Name</TableHead>
                        <TableHead>Upload Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDocuments.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            {loading ? (
                              <div className="flex items-center justify-center">
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Loading...
                              </div>
                            ) : (
                              "No documents found"
                            )}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredDocuments.map((doc) => (
                          <TableRow key={doc.id}>
                            <TableCell>
                              <div className="flex items-center space-x-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={doc.student_avatar || "/placeholder.svg"} alt={doc.student_name || `Student ${doc.student_id}`} />
                                  <AvatarFallback>
                                    {(doc.student_name || `Student ${doc.student_id}`)
                                      .split(" ")
                                      .map((n) => n[0])
                                      .join("")}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-medium text-foreground">
                                    {doc.student_name || `Student ${doc.student_id}`}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    ID: {doc.student_id.toString().padStart(4, "0")}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                {getDocumentIcon(doc.document_type)}
                                <span className="font-medium">{getDocumentTypeLabel(doc.document_type)}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium text-sm">{doc.original_name}</div>
                                <div className="text-xs text-muted-foreground">{formatFileSize(doc.file_size)}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {new Date(doc.uploaded_at).toLocaleDateString()}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                {getStatusBadge(doc.status)}
                                {doc.status.toLowerCase() === "rejected" && doc.rejection_reason && (
                                  <div className="text-xs text-destructive">{doc.rejection_reason}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem asChild>
                                  <DocumentPreviewDialog 
                                    document={doc} 
                                    onVerified={handleDocumentVerified}
                                  />
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDownload(doc.id)}>
                                  <Download className="mr-2 h-4 w-4" />
                                  Download
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="text-destructive"
                                  onClick={() => handleDelete(doc.id)}
                                >
                                  <X className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                              </DropdownMenu>
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

          <TabsContent value="document-types" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Document Types</CardTitle>
                <CardDescription>Configure required document types for student enrollment</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {documentTypes.map((type, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-5 w-5 text-chart-1" />
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{type.name}</span>
                            {type.required && (
                              <Badge variant="secondary" className="text-xs">
                                Required
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">{type.description}</div>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        Configure
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  )
}
