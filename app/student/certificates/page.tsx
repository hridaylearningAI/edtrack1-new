"use client"

import Link from "next/link"
import StudentLayout from "@/components/student/student-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useUser } from "@/lib/hooks/useUser"
import { 
  Award, 
  Download, 
  ExternalLink,
  FileText,
  Loader2,
  AlertCircle,
  Mail,
  Calendar,
  CheckCircle,
  BookOpen,
  RefreshCw
} from "lucide-react"
import { useState, useEffect } from "react"
import { toast } from "sonner"

interface Certificate {
  id: number
  enrollment_id: number
  student_id: number
  course_id: number
  certificate_number: string
  certificate_url: string
  certificate_pdf_url: string
  issued_date: string
  issued_at: string
  email_sent: boolean
  email_sent_at: string | null
  enrollments?: {
    course_name?: string
    completion_date?: string
    grade?: string
    courses?: {
      name: string
      description?: string
    }
  }
}

export default function CertificatesPage() {
  const { user, isAuthenticated, isLoading, getAccessToken } = useUser()
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isAuthenticated || !user) return

    const fetchCertificates = async () => {
      try {
        setLoading(true)
        const token = await getAccessToken()
        if (!token) {
          throw new Error('Not authenticated')
        }

        const response = await fetch('/api/certificates', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        const data = await response.json()

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to fetch certificates')
        }

        setCertificates(data.data || [])
        setError(null)
      } catch (err: any) {
        console.error('Error fetching certificates:', err)
        setError(err.message || 'Failed to load certificates')
        toast.error('Failed to load certificates')
      } finally {
        setLoading(false)
      }
    }

    fetchCertificates()
  }, [isAuthenticated, user, getAccessToken])

  const handleDownloadCertificate = async (enrollmentId: number, certificateNumber: string) => {
    try {
      const token = await getAccessToken()
      if (!token) {
        toast.error('Please log in to download your certificate')
        return
      }
      
      const response = await fetch(`/api/certificates/view/${enrollmentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to download certificate')
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `certificate-${certificateNumber}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error: any) {
      console.error('Error downloading certificate:', error)
      toast.error(error.message || 'Failed to download certificate')
    }
  }

  if (isLoading || loading) {
    return (
      <StudentLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Loading Certificates...</h2>
            <p className="text-muted-foreground">Please wait while we load your certificates</p>
          </div>
        </div>
      </StudentLayout>
    )
  }

  return (
    <StudentLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">My Certificates</h1>
            <p className="text-muted-foreground mt-1">View and download your course completion certificates</p>
          </div>
        </div>

        {error ? (
          <Card>
            <CardContent className="p-8 text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Error Loading Certificates</h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={() => window.location.reload()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            </CardContent>
          </Card>
        ) : certificates.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Certificates Yet</h3>
              <p className="text-muted-foreground mb-4">
                You haven't completed any courses with certificates yet. Complete a course to earn your certificate!
              </p>
              <Link href="/student/current-units">
                <Button>
                  <BookOpen className="mr-2 h-4 w-4" />
                  View My Courses
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {certificates.map((certificate) => {
              const courseName = certificate.enrollments?.courses?.name || 
                                `Course ${certificate.course_id}`
              const completionDate = certificate.issued_date || certificate.enrollments?.completion_date

              return (
                <Card key={certificate.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <Award className="h-8 w-8 text-warning" />
                      <Badge variant="secondary" className="text-xs">
                        {certificate.certificate_number}
                      </Badge>
                    </div>
                    <CardTitle className="mt-2">{courseName}</CardTitle>
                    <CardDescription>
                      Certificate of Completion
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span>
                          Issued: {completionDate ? new Date(completionDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          }) : 'N/A'}
                        </span>
                      </div>

                      {certificate.email_sent && (
                        <div className="flex items-center text-sm text-success">
                          <Mail className="h-4 w-4 mr-2" />
                          <span>Email sent</span>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <Button
                          onClick={() => handleDownloadCertificate(certificate.enrollment_id, certificate.certificate_number)}
                          className="flex-1"
                          variant="default"
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download PDF
                        </Button>
                        <Button
                          onClick={async () => {
                            try {
                              const token = await getAccessToken()
                              if (!token) {
                                toast.error('Please log in to view your certificate')
                                return
                              }
                              
                              const response = await fetch(`/api/certificates/view/${certificate.enrollment_id}`, {
                                headers: {
                                  'Authorization': `Bearer ${token}`,
                                },
                              })
                              
                              if (!response.ok) {
                                const error = await response.json()
                                throw new Error(error.error || 'Failed to view certificate')
                              }
                              
                              const blob = await response.blob()
                              const url = window.URL.createObjectURL(blob)
                              window.open(url, '_blank')
                              // Clean up the URL after a delay
                              setTimeout(() => window.URL.revokeObjectURL(url), 100)
                            } catch (error: any) {
                              console.error('Error viewing certificate:', error)
                              toast.error(error.message || 'Failed to view certificate')
                            }
                          }}
                          variant="outline"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </StudentLayout>
  )
}
