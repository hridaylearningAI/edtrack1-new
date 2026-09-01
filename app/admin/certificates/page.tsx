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
import { Search, Award, Download, Send, Eye, MoreHorizontal, CheckCircle, Clock, FileText, Loader2, X } from "lucide-react"
import { CertificatePDFGenerator, CertificateData } from "@/lib/certificate-pdf-generator"
import { useState } from "react"
import { toast } from "sonner"
import { useCertificates, Certificate } from "@/lib/hooks/useCertificates"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// Mock data removed - now using real data from useCertificates hook

// Certificate templates removed

const getStatusBadge = (status: string) => {
  switch (status) {
    case "Issued":
      return (
        <Badge variant="default" className="bg-chart-3 text-white">
          <CheckCircle className="mr-1 h-3 w-3" />
          Issued
        </Badge>
      )
    case "Pending":
      return (
        <Badge variant="secondary">
          <Clock className="mr-1 h-3 w-3" />
          Pending
        </Badge>
      )
    case "Active":
      return (
        <Badge variant="default" className="bg-chart-1 text-white">
          Active
        </Badge>
      )
    case "Draft":
      return <Badge variant="outline">Draft</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

const getGradeColor = (grade: string) => {
  switch (grade) {
    case "A+":
      return "text-chart-3 font-bold"
    case "A":
      return "text-chart-3"
    case "B+":
      return "text-chart-4"
    case "B":
      return "text-chart-1"
    default:
      return "text-muted-foreground"
  }
}

export default function CertificatesPage() {
  const {
    certificates,
    loading,
    error,
    totalCertificates,
    issuedCertificates,
    pendingCertificates,
    totalDownloads,
    issueCertificate,
    refreshData
  } = useCertificates()
  
  const [downloadingCertificates, setDownloadingCertificates] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState("")
  const [previewCertificate, setPreviewCertificate] = useState<Certificate | null>(null)

  // Filter certificates based on search
  const filteredCertificates = certificates.filter((certificate) => 
    searchTerm === "" || 
    certificate.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    certificate.course.toLowerCase().includes(searchTerm.toLowerCase()) ||
    certificate.certificateNumber.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleDownloadCertificate = async (certificate: any) => {
    if (certificate.status !== "Issued") {
      toast.error("Only issued certificates can be downloaded")
      return
    }

    setDownloadingCertificates(prev => new Set(prev).add(certificate.id))
    
    try {
      const certificateData: CertificateData = {
        id: certificate.id,
        studentName: certificate.studentName,
        studentEmail: certificate.studentEmail,
        course: certificate.course,
        completionDate: certificate.completionDate,
        issueDate: certificate.issueDate,
        certificateNumber: certificate.certificateNumber,
        grade: certificate.grade,
        status: certificate.status
      }

      await CertificatePDFGenerator.generatePDF(certificateData)
      toast.success(`Certificate for ${certificate.studentName} downloaded successfully`)
    } catch (error) {
      console.error('Error downloading certificate:', error)
      toast.error('Failed to download certificate. Please try again.')
    } finally {
      setDownloadingCertificates(prev => {
        const newSet = new Set(prev)
        newSet.delete(certificate.id)
        return newSet
      })
    }
  }

  const handleIssueCertificate = async (certificate: any) => {
    try {
      // Extract enrollment ID from certificate ID (format: cert-{enrollmentId})
      const enrollmentId = parseInt(certificate.id.replace('cert-', ''))
      await issueCertificate(enrollmentId)
    } catch (error) {
      console.error('Error issuing certificate:', error)
      toast.error('Failed to issue certificate. Please try again.')
    }
  }

  const handlePreviewCertificate = (certificate: Certificate) => {
    setPreviewCertificate(certificate)
  }

  if (loading && certificates.length === 0) {
    return (
              <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading certificates...</span>
        </div>
    )
  }

  return (
          <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-foreground">Certificates</h2>
            <p className="text-muted-foreground mt-2">Manage course completion certificates</p>
          </div>
          <div className="flex space-x-2">
            <Button className="bg-primary hover:bg-primary/90">
              <Award className="mr-2 h-4 w-4" />
              Issue Certificate
            </Button>
          </div>
        </div>

        {/* Certificate Statistics */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-foreground">{totalCertificates}</div>
                  <p className="text-xs text-muted-foreground">Total Certificates</p>
                </div>
                <Award className="h-8 w-8 text-chart-1" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-foreground">{issuedCertificates}</div>
                  <p className="text-xs text-muted-foreground">Issued</p>
                </div>
                <CheckCircle className="h-8 w-8 text-chart-3" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-foreground">{pendingCertificates}</div>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
                <Clock className="h-8 w-8 text-chart-4" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-foreground">{totalDownloads}</div>
                  <p className="text-xs text-muted-foreground">Downloads</p>
                </div>
                <Download className="h-8 w-8 text-chart-2" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Certificates Management */}
        <div className="grid gap-6">
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Certificate Management</CardTitle>
                <CardDescription>Issue and manage student certificates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input 
                      placeholder="Search certificates..." 
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
                        <TableHead>Student</TableHead>
                        <TableHead>Course</TableHead>
                        <TableHead>Grade</TableHead>
                        <TableHead>Completion</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Download</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCertificates.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            {loading ? (
                              <div className="flex items-center justify-center">
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Loading...
                              </div>
                            ) : (
                              "No certificates found"
                            )}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredCertificates.map((certificate) => (
                          <TableRow key={certificate.id}>
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage
                                  src={certificate.avatar || "/placeholder.svg"}
                                  alt={certificate.studentName}
                                />
                                <AvatarFallback>
                                  {certificate.studentName
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium text-sm">{certificate.studentName}</div>
                                <div className="text-xs text-muted-foreground">{certificate.certificateNumber}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{certificate.course}</div>
                          </TableCell>
                          <TableCell>
                            <span className={`font-medium ${getGradeColor(certificate.grade)}`}>
                              {certificate.grade}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{new Date(certificate.completionDate).toLocaleDateString()}</div>
                          </TableCell>
                          <TableCell>{getStatusBadge(certificate.status)}</TableCell>
                          <TableCell>
                            {certificate.status === "Issued" ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownloadCertificate(certificate)}
                                disabled={downloadingCertificates.has(certificate.id)}
                                className="w-full"
                              >
                                {downloadingCertificates.has(certificate.id) ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Generating...
                                  </>
                                ) : (
                                  <>
                                    <Download className="mr-2 h-4 w-4" />
                                    Download
                                  </>
                                )}
                              </Button>
                            ) : (
                              <span className="text-muted-foreground text-sm">Not Available</span>
                            )}
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
                                <DropdownMenuItem onClick={() => handlePreviewCertificate(certificate)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Preview Certificate
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleDownloadCertificate(certificate)}
                                  disabled={certificate.status !== "Issued" || downloadingCertificates.has(certificate.id)}
                                >
                                  {downloadingCertificates.has(certificate.id) ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  ) : (
                                    <Download className="mr-2 h-4 w-4" />
                                  )}
                                  {downloadingCertificates.has(certificate.id) ? 'Generating PDF...' : 'Download PDF'}
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Send className="mr-2 h-4 w-4" />
                                  Send to Student
                                </DropdownMenuItem>
                                {certificate.status === "Pending" && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                      className="text-chart-3"
                                      onClick={() => handleIssueCertificate(certificate)}
                                    >
                                      <CheckCircle className="mr-2 h-4 w-4" />
                                      Issue Certificate
                                    </DropdownMenuItem>
                                  </>
                                )}
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
          </div>
        </div>

        {/* Certificate Preview Dialog */}
        <Dialog open={!!previewCertificate} onOpenChange={() => setPreviewCertificate(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Certificate Preview</DialogTitle>
              <DialogDescription>
                Preview of the certificate that will be generated for {previewCertificate?.studentName}
              </DialogDescription>
            </DialogHeader>
            
            {previewCertificate && (
              <div className="mt-6">
                {/* Certificate Preview */}
                <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-8 rounded-lg text-white relative overflow-hidden">
                  {/* Background Pattern */}
                  <div className="absolute inset-0 opacity-10">
                    {Array.from({ length: 50 }).map((_, i) => (
                      <div
                        key={i}
                        className="absolute w-2 h-2 bg-white rounded-full"
                        style={{
                          left: `${Math.random() * 100}%`,
                          top: `${Math.random() * 100}%`,
                        }}
                      />
                    ))}
                  </div>
                  
                  {/* Certificate Content */}
                  <div className="relative bg-white rounded-lg p-8 text-gray-900 shadow-2xl">
                    {/* Header */}
                    <div className="text-center mb-8">
                      <div className="flex items-center justify-center mb-4">
                        <img 
                          src="/images/etia-logo.png" 
                          alt="EdTec Institute Logo" 
                          className="w-16 h-16 object-contain"
                          onError={(e) => {
                            // Fallback to icon if logo not found
                            const target = e.currentTarget as HTMLImageElement
                            const fallback = target.nextElementSibling as HTMLElement
                            target.style.display = 'none'
                            if (fallback) {
                              fallback.style.display = 'flex'
                            }
                          }}
                        />
                        <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center" style={{display: 'none'}}>
                          <Award className="w-8 h-8 text-white" />
                        </div>
                      </div>
                      <h1 className="text-3xl font-bold text-gray-800 mb-2">EdTec.online</h1>
                      <p className="text-gray-600">Empowering Education Through Technology</p>
                      <div className="w-32 h-0.5 bg-blue-600 mx-auto mt-4"></div>
                    </div>

                    {/* Certificate Title */}
                    <div className="text-center mb-8">
                      <h2 className="text-4xl font-bold text-gray-800 mb-4">Certificate of Completion</h2>
                      <p className="text-xl text-gray-600">This is to certify that</p>
                    </div>

                    {/* Student Name */}
                    <div className="text-center mb-8">
                      <h3 className="text-3xl font-bold text-blue-600 mb-4">{previewCertificate.studentName}</h3>
                  <p className="text-lg text-gray-700 leading-relaxed max-w-3xl mx-auto">
                    has successfully completed the course <strong>"{previewCertificate.course}"</strong> and demonstrated commitment to learning and professional development.
                  </p>
                    </div>

                    {/* Certificate Details */}
                    <div className="bg-gray-50 rounded-lg p-6 mb-8">
                      <div className="grid grid-cols-3 gap-6 text-center">
                        <div>
                          <p className="text-sm text-gray-500 uppercase tracking-wide mb-2">Completion Date</p>
                          <p className="font-semibold text-gray-800">
                            {new Date(previewCertificate.completionDate).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 uppercase tracking-wide mb-2">Grade Achieved</p>
                          <p className="font-semibold text-green-600 text-xl">{previewCertificate.grade}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 uppercase tracking-wide mb-2">Issue Date</p>
                          <p className="font-semibold text-gray-800">
                            {previewCertificate.issueDate 
                              ? new Date(previewCertificate.issueDate).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })
                              : 'Pending'
                            }
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Signatures */}
                    <div className="flex justify-center mt-8">
                      <div className="text-center">
                        <div className="w-32 h-0.5 bg-gray-400 mx-auto mb-2"></div>
                        <p className="font-semibold text-gray-800">Ashok Chanda</p>
                        <p className="text-sm text-gray-600">Founder</p>
                      </div>
                    </div>

                    {/* Certificate Number */}
                    <div className="text-right mt-8">
                      <p className="text-xs text-gray-500">Certificate No: {previewCertificate.certificateNumber}</p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-4 mt-6">
                  <Button variant="outline" onClick={() => setPreviewCertificate(null)}>
                    <X className="mr-2 h-4 w-4" />
                    Close
                  </Button>
                  {previewCertificate.status === "Issued" && (
                    <Button onClick={() => {
                      setPreviewCertificate(null)
                      handleDownloadCertificate(previewCertificate)
                    }}>
                      <Download className="mr-2 h-4 w-4" />
                      Download PDF
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
  )
}
