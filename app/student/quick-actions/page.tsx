"use client"

import React, { useState, useEffect, Suspense } from "react"
import StudentLayout from "@/components/student/student-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { useUser } from "@/lib/hooks/useUser"
import { useEnrollments } from "@/lib/hooks/useEnrollments"
import { 
  User,
  Phone,
  CheckCircle,
  Loader2,
  AlertCircle
} from "lucide-react"

function QuickActionsContent() {
  const { user, isAuthenticated, isLoading, getAccessToken } = useUser()
  const { enrollments, loading: enrollmentsLoading, error: enrollmentsError } = useEnrollments()
  

  // Student profile (phone, student_number) state
  const [phone, setPhone] = useState('')
  const [studentNumber, setStudentNumber] = useState<string | null>(null)
  const [phoneSaving, setPhoneSaving] = useState(false)
  const [phoneMessage, setPhoneMessage] = useState('')
  const [studentProfileLoaded, setStudentProfileLoaded] = useState(false)

  // Load student profile (phone) when authenticated
  useEffect(() => {
    if (!isAuthenticated || !user || !getAccessToken) return
    const loadStudentProfile = async () => {
      try {
        const token = await getAccessToken()
        if (!token) return
        const res = await fetch('/api/profile/student', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const json = await res.json()
        if (json.success && json.data) {
          if (json.data.phone != null) setPhone(String(json.data.phone).trim())
          if (json.data.student_number != null) setStudentNumber(String(json.data.student_number))
        }
      } catch (_) {
        // ignore
      } finally {
        setStudentProfileLoaded(true)
      }
    }
    loadStudentProfile()
  }, [isAuthenticated, user, getAccessToken])

  // Save phone number
  const handleSavePhone = async () => {
    if (!getAccessToken) return
    setPhoneSaving(true)
    setPhoneMessage('')
    try {
      const token = await getAccessToken()
      if (!token) {
        setPhoneMessage('Please log in to save your phone number.')
        return
      }
      const res = await fetch('/api/profile/student', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ phone: phone.trim() }),
      })
      const json = await res.json()
      if (json.success) {
        setPhoneMessage('Phone number saved successfully.')
        setPhone(phone.trim())
      } else {
        setPhoneMessage(json.message || 'Failed to save phone number.')
      }
    } catch (_) {
      setPhoneMessage('Failed to save phone number. Please try again.')
    } finally {
      setPhoneSaving(false)
      setTimeout(() => setPhoneMessage(''), 5000)
    }
  }

  // Show loading state
  if (isLoading || enrollmentsLoading) {
    return (
      <StudentLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Loading...</h2>
            <p className="text-muted-foreground">Please wait while we load your information</p>
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
            <AlertCircle className="h-8 w-8 mx-auto mb-4 text-destructive" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Error Loading Information</h2>
            <p className="text-muted-foreground">{enrollmentsError}</p>
          </div>
        </div>
      </StudentLayout>
    )
  }

  return (
    <StudentLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-foreground">Quick Actions</h2>
            <p className="text-muted-foreground mt-2">Common tasks and shortcuts for students</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="mr-2 h-5 w-5" />
                  Personal Information
                </CardTitle>
                <CardDescription>View your personal details and account information</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Label htmlFor="displayName" className="w-32 flex-shrink-0">Full Name</Label>
                    <Input 
                      id="displayName" 
                      value={user?.name || 'Not available'}
                      disabled
                      className="flex-1"
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <Label htmlFor="displayEmail" className="w-32 flex-shrink-0">Email Address</Label>
                    <Input 
                      id="displayEmail" 
                      type="email" 
                      value={user?.email || 'Not available'}
                      disabled
                      className="flex-1"
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <Label htmlFor="phone" className="w-32 flex-shrink-0">
                      <Phone className="inline h-4 w-4 mr-1" />
                      Mobile Number
                    </Label>
                    <div className="flex-1 flex gap-2">
                      <Input 
                        id="phone" 
                        type="tel" 
                        placeholder="Enter your mobile number"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="flex-1"
                        disabled={!studentProfileLoaded}
                      />
                      <Button 
                        onClick={handleSavePhone} 
                        disabled={phoneSaving || !studentProfileLoaded}
                      >
                        {phoneSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                        {phoneSaving ? ' Saving...' : ' Save'}
                      </Button>
                    </div>
                  </div>
                  {phoneMessage && (
                    <p className={`text-sm ${phoneMessage.includes('success') ? 'text-success' : 'text-warning'}`}>
                      {phoneMessage}
                    </p>
                  )}
                  <div className="flex items-center gap-4">
                    <Label htmlFor="studentId" className="w-32 flex-shrink-0">Student ID</Label>
                    <Input 
                      id="studentId" 
                      value={studentNumber || (user?.id ? `STU${user.id}` : '—')} 
                      disabled 
                      className="flex-1"
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <Label htmlFor="enrollmentDate" className="w-32 flex-shrink-0">Enrollment Date</Label>
                    <Input 
                      id="enrollmentDate" 
                      defaultValue={enrollments.length > 0 ? enrollments[0].enrollment_date : '2023-09-01'} 
                      disabled 
                      className="flex-1"
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <Label htmlFor="activeCourses" className="w-32 flex-shrink-0">Active Courses</Label>
                    <Input 
                      id="activeCourses" 
                      defaultValue={enrollments.filter(e => e.status === 'active').length.toString()} 
                      disabled 
                      className="flex-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
        </div>
      </div>
    </StudentLayout>
  )
}

export default function QuickActionsPage() {
  return (
    <Suspense fallback={
      <StudentLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Loading...</h2>
            <p className="text-muted-foreground">Please wait while we load the page</p>
          </div>
        </div>
      </StudentLayout>
    }>
      <QuickActionsContent />
    </Suspense>
  )
}
