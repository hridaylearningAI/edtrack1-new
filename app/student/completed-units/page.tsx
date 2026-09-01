"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import StudentLayout from "@/components/student/student-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useEnrollments } from "@/lib/hooks/useEnrollments"
import { useUser } from "@/lib/hooks/useUser"
import { 
  CheckCircle, 
  Download, 
  Award, 
  FileText,
  Loader2,
  AlertCircle,
  GraduationCap
} from "lucide-react"
import { getCertificateUpgradeDetails, createUpgradeCheckoutSession, fulfillCertificateUpgrade } from "@/lib/certificateUpgrade"
import { toast } from "sonner"

// Mock data for achievements, certificates, and transcripts (can be replaced with real data later)
const getMockAchievements = (courseId: number) => [
  "Course Completion Award",
  "Outstanding Performance Recognition"
]

const getMockCertificates = (courseId: number, completionDate: string) => [
  { name: "Course Completion Certificate", type: "PDF", issued: completionDate },
  { name: "Digital Achievement Badge", type: "Digital Badge", issued: completionDate }
]


export default function CompletedUnitsPage() {
  const { user, isAuthenticated, isLoading, getAccessToken } = useUser()
  const { enrollments, loading: enrollmentsLoading, error: enrollmentsError, refreshEnrollments } = useEnrollments()
  const [upgradeLoading, setUpgradeLoading] = useState(false)

  // Handle return from Stripe Checkout (upgrade_success + session_id in URL)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const upgradeSuccess = params.get('upgrade_success')
    const sessionId = params.get('session_id')
    if (upgradeSuccess !== '1' || !sessionId) return

    const fulfill = async () => {
      const token = await getAccessToken()
      if (!token) return
      const result = await fulfillCertificateUpgrade(sessionId, token)
      if (result.success) {
        toast.success("Certificate upgrade successful! Your enrollment now includes a certificate.")
      } else {
        toast.error(result.error || "Failed to complete upgrade.")
      }
      window.history.replaceState({}, '', '/student/completed-units')
      refreshEnrollments()
    }
    fulfill()
  }, [getAccessToken, refreshEnrollments])

  const handleUpgradeClick = async (enrollment: { id: number; course_id: number; courses?: unknown }) => {
    try {
      setUpgradeLoading(true)
      const token = await getAccessToken()
      if (!token) {
        toast.error("Please log in to upgrade your course.")
        return
      }
      const detailsResult = await getCertificateUpgradeDetails(enrollment.id, token)
      if (!detailsResult.success || !detailsResult.data) {
        toast.error(detailsResult.error || "Certificate upgrade is not available for this course.")
        return
      }
      const checkoutResult = await createUpgradeCheckoutSession(
        enrollment.id,
        token,
        '/student/completed-units'
      )
      if ('url' in checkoutResult) {
        window.location.href = checkoutResult.url
      } else {
        toast.error(checkoutResult.error || "Failed to redirect to checkout.")
      }
    } catch (error) {
      toast.error("Failed to load upgrade details. Please try again.")
    } finally {
      setUpgradeLoading(false)
    }
  }

  // Show loading state
  if (isLoading || enrollmentsLoading) {
    return (
      <StudentLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading...</h2>
            <p className="text-gray-600">Please wait while we load your completed units</p>
          </div>
        </div>
      </StudentLayout>
    )
  }

  // Show error state
  if (enrollmentsError) {
    return (
      <StudentLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-4 text-red-600" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Units</h2>
            <p className="text-gray-600">{enrollmentsError}</p>
          </div>
        </div>
      </StudentLayout>
    )
  }

  // Filter completed enrollments
  const completedEnrollments = enrollments.filter(enrollment => enrollment.status === 'completed')
  
  // Calculate statistics
  const totalCompletedUnits = completedEnrollments.length
  const totalAchievements = completedEnrollments.length * 2 // Mock calculation (2 achievements per course)

  return (
    <StudentLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-foreground">Completed Units</h2>
            <p className="text-muted-foreground mt-2">View your academic achievements and completed courses</p>
          </div>
          <div className="flex space-x-2">
            <Link href="/student/certificates">
              <Button className="bg-primary hover:bg-primary/90">
                <Award className="mr-2 h-4 w-4" />
                View Certificates
              </Button>
            </Link>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-foreground">{totalCompletedUnits}</div>
                  <p className="text-xs text-muted-foreground">Completed Units</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-foreground">{totalAchievements}</div>
                  <p className="text-xs text-muted-foreground">Achievements</p>
                </div>
                <Award className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Units List */}
        {completedEnrollments.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Completed Units</h3>
              <p className="text-gray-600 mb-4">You haven't completed any courses yet.</p>
              <Button className="bg-primary hover:bg-primary/90">
                Browse Courses
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {completedEnrollments.map((enrollment) => {
              const achievements = getMockAchievements(enrollment.course_id)
              const certificates = getMockCertificates(enrollment.course_id, enrollment.completion_date || enrollment.enrollment_date)
              
              return (
                <Card key={enrollment.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center">
                          <CheckCircle className="mr-2 h-5 w-5 text-green-600" />
                          {(enrollment.courses as any)?.name || enrollment.course_name || `Course ${enrollment.course_id}`}
                        </CardTitle>
                        <CardDescription className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span>Course ID: {enrollment.course_id}</span>
                          <span>•</span>
                          <span>Completed: {enrollment.completion_date || enrollment.enrollment_date}</span>
                          {enrollment.grade && (
                            <>
                              <span>•</span>
                              <span className="font-medium text-foreground">Final grade: {enrollment.grade}</span>
                            </>
                          )}
                        </CardDescription>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="default" className="bg-green-600">
                          Grade: {enrollment.grade || 'N/A'}
                        </Badge>
                        {!enrollment.with_certificate && (() => {
                          const course = enrollment.courses as { price_without_certificate?: number | null; price_with_certificate?: number | null } | null;
                          const hasUpgradePath = course?.price_without_certificate != null && course?.price_with_certificate != null;
                          if (!hasUpgradePath) return null;
                          return (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpgradeClick(enrollment)}
                              disabled={upgradeLoading}
                              className="flex items-center gap-1"
                              title="Upgrade to include a certificate"
                            >
                              {upgradeLoading ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <GraduationCap className="h-3 w-3" />
                              )}
                              Upgrade to Certificate
                            </Button>
                          );
                        })()}
                        {enrollment.with_certificate && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              try {
                                const token = await getAccessToken()
                                if (!token) {
                                  alert('Please log in to view your certificate')
                                  return
                                }
                                
                                const response = await fetch(`/api/certificates/view/${enrollment.id}`, {
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
                                alert(error.message || 'Failed to view certificate')
                              }
                            }}
                            className="flex items-center gap-1"
                          >
                            <Award className="h-3 w-3" />
                            View Certificate
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="overview" className="w-full">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="achievements">Achievements</TabsTrigger>
                        <TabsTrigger value="certificates">Certificates</TabsTrigger>
                      </TabsList>

                      <TabsContent value="overview" className="space-y-4">
                        <div className="grid gap-6 lg:grid-cols-2">
                          <div>
                            <h4 className="font-semibold mb-3">Course Description</h4>
                            <div 
                              className="text-sm text-muted-foreground [&>p]:mb-2 [&>ul]:list-disc [&>ul]:ml-4 [&>ol]:list-decimal [&>ol]:ml-4 [&>li]:mb-1 [&>h1]:text-lg [&>h1]:font-bold [&>h1]:mb-2 [&>h2]:text-base [&>h2]:font-bold [&>h2]:mb-2 [&>h3]:text-sm [&>h3]:font-semibold [&>h3]:mb-2 [&>strong]:font-semibold [&>em]:italic [&>a]:text-primary [&>a]:underline [&>blockquote]:border-l-4 [&>blockquote]:border-muted [&>blockquote]:pl-4 [&>blockquote]:italic [&>code]:bg-muted [&>code]:px-1 [&>code]:py-0.5 [&>code]:rounded [&>code]:text-xs"
                              dangerouslySetInnerHTML={{
                                __html: (enrollment.courses as any)?.description || enrollment.course_description || '<p>No description available for this course.</p>'
                              }}
                            />
                          </div>
                          <div>
                            <h4 className="font-semibold mb-3">Completion Details</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span>Completion Date:</span>
                                <span className="font-medium">{enrollment.completion_date || enrollment.enrollment_date}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span>Final Grade:</span>
                                <span className="font-semibold text-base">{enrollment.grade || 'N/A'}</span>
                              </div>
                              {enrollment.grade && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Based on your quiz results (average of latest attempt per quiz).
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="achievements" className="space-y-4">
                        <h4 className="font-semibold">Achievements & Recognition</h4>
                        <div className="space-y-3">
                          {achievements.map((achievement, index) => (
                            <div key={index} className="flex items-center space-x-3 p-3 border rounded-lg">
                              <Award className="h-5 w-5 text-yellow-600" />
                              <span className="font-medium">{achievement}</span>
                            </div>
                          ))}
                        </div>
                      </TabsContent>

                      <TabsContent value="certificates" className="space-y-4">
                        <h4 className="font-semibold">Certificates & Badges</h4>
                        {enrollment.with_certificate ? (
                          <div className="space-y-3">
                            {/* Check if certificate exists - this would need to be fetched from API */}
                            <div className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex items-center space-x-3">
                                <FileText className="h-5 w-5 text-blue-600" />
                                <div>
                                  <p className="font-medium">Course Completion Certificate</p>
                                  <p className="text-sm text-muted-foreground">
                                    PDF • Issued: {enrollment.completion_date || enrollment.enrollment_date}
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={async () => {
                                    try {
                                      const token = await getAccessToken()
                                      if (!token) {
                                        alert('Please log in to view your certificate')
                                        return
                                      }
                                      
                                      const response = await fetch(`/api/certificates/view/${enrollment.id}`, {
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
                                      alert(error.message || 'Failed to view certificate')
                                    }
                                  }}
                                >
                                  <Award className="mr-1 h-3 w-3" />
                                  View
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={async () => {
                                    try {
                                      const token = await getAccessToken()
                                      if (!token) {
                                        alert('Please log in to download your certificate')
                                        return
                                      }
                                      
                                      const response = await fetch(`/api/certificates/view/${enrollment.id}`, {
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
                                      a.download = `certificate-${enrollment.id}.pdf`
                                      document.body.appendChild(a)
                                      a.click()
                                      window.URL.revokeObjectURL(url)
                                      document.body.removeChild(a)
                                    } catch (error: any) {
                                      console.error('Error downloading certificate:', error)
                                      alert(error.message || 'Failed to download certificate')
                                    }
                                  }}
                                >
                                  <Download className="mr-1 h-3 w-3" />
                                  Download
                                </Button>
                              </div>
                            </div>
                            <div className="text-sm text-muted-foreground p-3 bg-blue-50 rounded-lg">
                              <p>💡 If you don't see your certificate, it may still be generating. Please check the <Link href="/student/certificates" className="text-blue-600 underline">Certificates page</Link> or try syncing your progress again.</p>
                            </div>
                          </div>
                        ) : (() => {
                          const course = enrollment.courses as { price_without_certificate?: number | null; price_with_certificate?: number | null } | null;
                          const hasUpgradePath = course?.price_without_certificate != null && course?.price_with_certificate != null;
                          if (!hasUpgradePath) return null;
                          return (
                            <div className="text-center py-8 space-y-4">
                              <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                              <p className="text-sm text-gray-600">This course was purchased without a certificate.</p>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleUpgradeClick(enrollment)}
                                disabled={upgradeLoading}
                                className="flex items-center gap-1 mx-auto"
                              >
                                {upgradeLoading ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <GraduationCap className="h-3 w-3" />
                                )}
                                Upgrade to Certificate
                              </Button>
                            </div>
                          );
                        })()}
                      </TabsContent>
                    </Tabs>

                    <div className="flex items-center justify-between mt-6 pt-6 border-t">
                      <div className="text-sm text-muted-foreground">
                        Completed {enrollment.completion_date || enrollment.enrollment_date}
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
