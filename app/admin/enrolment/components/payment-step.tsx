import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ArrowRight, ArrowLeft, CreditCard, DollarSign, CheckCircle, Mail, Loader2, RefreshCw } from "lucide-react"
import { EnrollmentData } from "../page"
import { Label } from "@/components/ui/label"
import { useUser } from "@/lib/hooks/useUser"
import { useEnrollments } from "@/lib/hooks/useEnrollments"
import { useStudents } from "@/lib/hooks/useStudents"
import { toast } from "sonner"

interface PaymentStepProps {
  enrollmentData: EnrollmentData
  updateEnrollmentData: (data: Partial<EnrollmentData>) => void
  onNext: () => void
  onPrev: () => void
  currentStep: number
  totalSteps: number
}

export function PaymentStep({ 
  enrollmentData, 
  updateEnrollmentData, 
  onNext, 
  onPrev, 
  currentStep, 
  totalSteps 
}: PaymentStepProps) {
  const { getAccessToken } = useUser()
  const { createEnrollment } = useEnrollments()
  const { createStudent } = useStudents()
  const [isCreatingEnrollment, setIsCreatingEnrollment] = useState(false)
  const [isCreatingPayment, setIsCreatingPayment] = useState(false)
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [isCheckingStatus, setIsCheckingStatus] = useState(false)

  const selectedCourse = enrollmentData.selectedCourse
  const coursePrice = selectedCourse?.price || 0
  const totalAmount = coursePrice + 50

  // Auto-refresh payment status when enrollment exists and payment is pending
  useEffect(() => {
    if (!enrollmentData.enrollmentId || enrollmentData.paymentStatus === 'completed') {
      return
    }

    // Check payment status on mount and periodically if pending
    const checkStatus = async () => {
      try {
        const token = await getAccessToken()
        if (!token) return

        // First check Stripe session status directly (more reliable)
        if (enrollmentData.paymentSessionId) {
          const stripeResponse = await fetch('/api/enrollments/check-payment-status', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              enrollmentId: enrollmentData.enrollmentId,
              paymentSessionId: enrollmentData.paymentSessionId,
            }),
          })

          if (stripeResponse.ok) {
            const stripeData = await stripeResponse.json()
            if (stripeData.success && stripeData.data) {
              const currentPaymentStatus = stripeData.data.paymentStatus || 'pending'
              
              if (currentPaymentStatus !== enrollmentData.paymentStatus) {
                updateEnrollmentData({
                  paymentStatus: currentPaymentStatus as 'pending' | 'completed' | 'failed',
                })

                if (currentPaymentStatus === 'completed') {
                  toast.success("Payment completed! Enrollment is now active.")
                  // Auto-advance to next step after a delay
                  setTimeout(() => {
                    onNext()
                  }, 2000)
                }
                return // Exit early if status was updated
              }
            }
          }
        }

        // Fallback: Check enrollment status from database
        const response = await fetch(`/api/enrollments/${enrollmentData.enrollmentId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          if (data.success && data.data) {
            const enrollment = data.data
            const currentPaymentStatus = enrollment.payment_status || 'pending'
            
            if (currentPaymentStatus !== enrollmentData.paymentStatus) {
              updateEnrollmentData({
                paymentStatus: currentPaymentStatus as 'pending' | 'completed' | 'failed',
              })

              if (currentPaymentStatus === 'completed') {
                toast.success("Payment completed! Enrollment is now active.")
                // Auto-advance to next step after a delay
                setTimeout(() => {
                  onNext()
                }, 2000)
              }
            }
          }
        }
      } catch (error) {
        console.error('Error checking payment status:', error)
      }
    }

    // Check immediately
    checkStatus()

    // Set up polling if payment is still pending
    if (enrollmentData.paymentStatus === 'pending' || !enrollmentData.paymentStatus) {
      const interval = setInterval(checkStatus, 5000) // Check every 5 seconds
      return () => clearInterval(interval)
    }
  }, [enrollmentData.enrollmentId, enrollmentData.paymentStatus])

  // Check URL params for payment success (when returning from Stripe)
  useEffect(() => {
    if (typeof window === 'undefined' || !enrollmentData.enrollmentId) return

    const params = new URLSearchParams(window.location.search)
    const paymentStatus = params.get('payment')
    const enrollmentIdParam = params.get('enrollmentId')

    if (paymentStatus === 'success' && enrollmentIdParam && enrollmentIdParam === String(enrollmentData.enrollmentId)) {
      // Payment was successful, refresh the status
      const checkStatus = async () => {
        try {
          const token = await getAccessToken()
          if (!token) return

          const response = await fetch(`/api/enrollments/${enrollmentData.enrollmentId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          })

          if (response.ok) {
            const data = await response.json()
            if (data.success && data.data) {
              const enrollment = data.data
              updateEnrollmentData({
                paymentStatus: (enrollment.payment_status || 'pending') as 'pending' | 'completed' | 'failed',
              })

              if (enrollment.payment_status === 'completed') {
                toast.success("Payment completed! Enrollment is now active.")
                setTimeout(() => {
                  onNext()
                }, 2000)
              }
            }
          }
        } catch (error) {
          console.error('Error checking payment status:', error)
        }
      }

      checkStatus()
      
      // Clean up URL params
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [enrollmentData.enrollmentId])

  const handleCreateEnrollment = async () => {
    if (!selectedCourse || !enrollmentData.email) {
      toast.error("Please complete previous steps first")
      return
    }

    setIsCreatingEnrollment(true)
    try {
      const token = await getAccessToken()
      if (!token) {
        throw new Error("Not authenticated. Please log in again.")
      }

      // Create or get student first
      // Always check students table first to get the correct student ID
      let studentId: number | undefined = undefined

      // First, check if student already exists in students table by email
      const checkResponse = await fetch(`/api/students?email=${encodeURIComponent(enrollmentData.email)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (checkResponse.ok) {
        const checkData = await checkResponse.json()
        if (checkData.success && checkData.data && checkData.data.length > 0) {
          // Student already exists in students table, use existing ID
          studentId = checkData.data[0].id
          updateEnrollmentData({ studentId })
        }
      }

      // If student doesn't exist in students table, create new one
      if (!studentId) {
          const studentPayload = {
            name: `${enrollmentData.firstName} ${enrollmentData.lastName}`,
            email: enrollmentData.email,
            status: "active",
            phone: enrollmentData.phone || null,
            address: enrollmentData.address ? `${enrollmentData.address}, ${enrollmentData.city}, ${enrollmentData.state} ${enrollmentData.zipCode}, ${enrollmentData.country}` : null,
            date_of_birth: enrollmentData.dateOfBirth || null,
            grade: 'N/A'
          }


          const studentResponse = await fetch('/api/students', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(studentPayload),
          })

          if (!studentResponse.ok) {
            const errorText = await studentResponse.text()
            console.error('Student creation failed:', errorText)
            throw new Error(`Failed to create student: ${studentResponse.status} ${studentResponse.statusText} - ${errorText}`)
          }

          const studentData = await studentResponse.json()

          if (!studentData.success || !studentData.data) {
            console.error('Student creation response:', studentData)
            throw new Error(studentData.message || 'Failed to create student')
          }


          // Use student_id if available (from students table), otherwise use id (from users table)
          // The students table ID is what enrollments need
          let createdStudentId = studentData.data.student_id || studentData.data.id
          
          if (!createdStudentId || typeof createdStudentId !== 'number') {
            console.error('Invalid student ID returned from creation:', createdStudentId, 'Full response:', studentData)
            // Try to get the student ID by querying the students table
            
            const verifyResponse = await fetch(`/api/students?email=${encodeURIComponent(enrollmentData.email)}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            })

            if (verifyResponse.ok) {
              const verifyData = await verifyResponse.json()
              if (verifyData.success && verifyData.data && verifyData.data.length > 0) {
                createdStudentId = verifyData.data[0].id
              } else {
                throw new Error('Student created but could not retrieve student ID from database')
              }
            } else {
              throw new Error(`Student created but invalid ID returned. Got: ${createdStudentId}, Type: ${typeof createdStudentId}`)
            }
          }

          studentId = createdStudentId
          updateEnrollmentData({ studentId })
          
          // Small delay to ensure database consistency
          await new Promise(resolve => setTimeout(resolve, 300))
        }

      // Verify student_id is valid before creating enrollment
      if (!studentId || typeof studentId !== 'number') {
        throw new Error(`Invalid student ID: ${studentId}`)
      }

      // Double-check student exists in database before creating enrollment
      const verifyStudentResponse = await fetch(`/api/students?email=${encodeURIComponent(enrollmentData.email)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (verifyStudentResponse.ok) {
        const verifyData = await verifyStudentResponse.json()
        if (verifyData.success && verifyData.data && verifyData.data.length > 0) {
          const foundStudent = verifyData.data.find((s: any) => s.id === studentId)
          if (!foundStudent) {
            // Use the found student ID instead
            studentId = verifyData.data[0].id
            updateEnrollmentData({ studentId })
          } else {
          }
        } else {
          throw new Error(`Student with email ${enrollmentData.email} not found in database`)
        }
      } else {
        console.warn('Could not verify student, proceeding anyway')
      }

      // Create enrollment directly via API with authentication
      // Use 'enrolled' status (payment_status will track payment state)
      const enrollmentPayload = {
        student_id: studentId,
        course_id: selectedCourse.id,
        enrollment_date: new Date().toISOString(),
        status: "enrolled" as const, // Use 'enrolled' status, payment_status tracks payment
        progress: 0.0,
        grade: "N/A",
        notes: `Enrolled via wizard. Payment pending.`
      }

      const response = await fetch('/api/enrollments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(enrollmentPayload),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to create enrollment: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const data = await response.json()

      if (!data.success || !data.data) {
        throw new Error(data.message || 'Failed to create enrollment')
      }

      const newEnrollment = data.data

      updateEnrollmentData({ 
        enrollmentId: newEnrollment.id,
        studentId,
        paymentStatus: 'pending'
      })

      toast.success("Enrollment created successfully. Now create payment link.")
    } catch (error: any) {
      console.error('Error creating enrollment:', error)
      toast.error(error.message || "Failed to create enrollment")
    } finally {
      setIsCreatingEnrollment(false)
    }
  }

  const handleCreatePaymentLink = async () => {
    if (!enrollmentData.enrollmentId || !enrollmentData.studentId || !selectedCourse) {
      // If enrollment doesn't exist, create it first
      await handleCreateEnrollment()
      if (!enrollmentData.enrollmentId) {
        return // Wait for enrollment to be created
      }
    }

    setIsCreatingPayment(true)
    try {
      const token = await getAccessToken()
      const response = await fetch('/api/enrollments/create-payment-link', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          enrollmentId: enrollmentData.enrollmentId,
          studentId: enrollmentData.studentId,
          courseId: selectedCourse.id,
          amount: totalAmount,
          studentEmail: enrollmentData.email,
          studentName: `${enrollmentData.firstName} ${enrollmentData.lastName}`,
          courseName: selectedCourse.name,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to create payment link')
      }

      updateEnrollmentData({
        paymentUrl: data.data.paymentUrl,
        paymentSessionId: data.data.sessionId,
        paymentStatus: 'pending',
      })

      toast.success("Payment link created successfully")
      
      // Automatically send email with payment link
      try {
        const emailResponse = await fetch('/api/enrollments/send-payment-email', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            studentEmail: enrollmentData.email,
            studentName: `${enrollmentData.firstName} ${enrollmentData.lastName}`,
            courseName: selectedCourse?.name,
            paymentUrl: data.data.paymentUrl,
            amount: totalAmount,
          }),
        })

        const emailData = await emailResponse.json()

        if (emailResponse.ok && emailData.success) {
          toast.success("Payment email sent to student successfully")
        } else {
          console.warn('Failed to auto-send email:', emailData.message)
          toast.warning("Payment link created, but email could not be sent automatically. Please send it manually.")
        }
      } catch (emailError: any) {
        console.error('Error auto-sending payment email:', emailError)
        toast.warning("Payment link created, but email could not be sent automatically. Please send it manually.")
      }
    } catch (error: any) {
      console.error('Error creating payment link:', error)
      toast.error(error.message || 'Failed to create payment link')
    } finally {
      setIsCreatingPayment(false)
    }
  }

  const handleSendPaymentEmail = async () => {
    if (!enrollmentData.paymentUrl) {
      toast.error("Please create payment link first")
      return
    }

    if (!enrollmentData.email) {
      toast.error("Student email is required")
      return
    }

    if (!selectedCourse?.name) {
      toast.error("Course information is missing")
      return
    }

    setIsSendingEmail(true)
    try {
      const token = await getAccessToken()
      if (!token) {
        throw new Error("Not authenticated. Please log in again.")
      }

      const response = await fetch('/api/enrollments/send-payment-email', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentEmail: enrollmentData.email,
          studentName: `${enrollmentData.firstName} ${enrollmentData.lastName}`,
          courseName: selectedCourse?.name,
          paymentUrl: enrollmentData.paymentUrl,
          amount: totalAmount,
        }),
      })

      const data = await response.json()


      if (!response.ok || !data.success) {
        const errorMessage = data.message || data.error || 'Failed to send email'
        console.error('Email API error:', errorMessage)
        throw new Error(errorMessage)
      }

      toast.success("Payment email sent to student successfully")
    } catch (error: any) {
      console.error('Error sending payment email:', error)
      const errorMessage = error.message || 'Failed to send payment email'
      toast.error(errorMessage)
      
      // Show more detailed error if available
      if (error.message?.includes('Email service not configured')) {
        toast.error("Email service is not configured. Please check RESEND_API_KEY environment variable.")
      }
    } finally {
      setIsSendingEmail(false)
    }
  }

  const handleCheckPaymentStatus = async () => {
    if (!enrollmentData.enrollmentId) {
      toast.error("Enrollment ID not found")
      return
    }

    setIsCheckingStatus(true)
    try {
      const token = await getAccessToken()
      if (!token) {
        throw new Error("Not authenticated")
      }

      // Check Stripe session status directly and update if needed
      const response = await fetch('/api/enrollments/check-payment-status', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          enrollmentId: enrollmentData.enrollmentId,
          paymentSessionId: enrollmentData.paymentSessionId,
        }),
      })

      const data = await response.json()

      if (data.success && data.data) {
        const currentPaymentStatus = data.data.paymentStatus || 'pending'
        
        updateEnrollmentData({
          paymentStatus: currentPaymentStatus as 'pending' | 'completed' | 'failed',
        })

        if (currentPaymentStatus === 'completed') {
          toast.success("Payment completed! Enrollment is now active.")
          // Auto-advance to next step after a delay
          setTimeout(() => {
            onNext()
          }, 2000)
        } else if (currentPaymentStatus === 'failed') {
          toast.error("Payment failed. Please try again.")
        } else {
          toast.info(`Payment status: ${currentPaymentStatus}. Checking Stripe...`)
        }
      } else {
        throw new Error(data.message || 'Failed to check payment status')
      }
    } catch (error: any) {
      console.error('Error checking payment status:', error)
      toast.error(error.message || 'Failed to check payment status')
    } finally {
      setIsCheckingStatus(false)
    }
  }

  const handleNext = () => {
    // Only allow proceeding if payment is completed or bypassed
    if (enrollmentData.paymentStatus === 'completed' || enrollmentData.paymentMethod === 'bypass') {
      onNext()
    } else {
      toast.error("Please complete payment or create payment link first")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <CreditCard className="mr-2 h-5 w-5" />
          Step {currentStep}: Payment Details
        </CardTitle>
        <CardDescription>Payment processing for your enrollment</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Payment Summary */}
        {selectedCourse && (
          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-semibold mb-3">Payment Summary</h4>
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span>Course:</span>
                <span className="font-medium">{selectedCourse.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Course Fee:</span>
                <span className="font-medium">${coursePrice}</span>
              </div>
              <div className="flex justify-between">
                <span>Registration Fee:</span>
                <span className="font-medium">$50</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between font-semibold text-lg">
                <span>Total Amount:</span>
                <span className="text-primary">${coursePrice + 50}</span>
              </div>
            </div>
          </div>
        )}

        {/* Payment Status */}
        {enrollmentData.paymentStatus && (
          <div className={`border rounded-lg p-4 ${
            enrollmentData.paymentStatus === 'completed' 
              ? 'bg-green-50 border-green-200' 
              : enrollmentData.paymentStatus === 'failed'
              ? 'bg-red-50 border-red-200'
              : 'bg-yellow-50 border-yellow-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <h5 className={`font-semibold ${
                  enrollmentData.paymentStatus === 'completed' 
                    ? 'text-green-900' 
                    : enrollmentData.paymentStatus === 'failed'
                    ? 'text-red-900'
                    : 'text-yellow-900'
                }`}>
                  Payment Status: {enrollmentData.paymentStatus.toUpperCase()}
                </h5>
                {enrollmentData.paymentStatus === 'pending' && (
                  <p className="text-sm text-yellow-700 mt-1">
                    Waiting for student to complete payment
                  </p>
                )}
              </div>
              {enrollmentData.paymentStatus === 'pending' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCheckPaymentStatus}
                  disabled={isCheckingStatus}
                >
                  {isCheckingStatus ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Enrollment & Payment Link Actions */}
        <div className="space-y-3">
          {!enrollmentData.enrollmentId ? (
            <Button
              className="w-full bg-primary hover:bg-primary/90"
              onClick={handleCreateEnrollment}
              disabled={isCreatingEnrollment}
            >
              {isCreatingEnrollment ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Enrollment...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Create Enrollment & Payment Link
                </>
              )}
            </Button>
          ) : !enrollmentData.paymentUrl ? (
            <Button
              className="w-full bg-primary hover:bg-primary/90"
              onClick={handleCreatePaymentLink}
              disabled={isCreatingPayment}
            >
              {isCreatingPayment ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Payment Link...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Create Stripe Payment Link
                </>
              )}
            </Button>
          ) : (
              <>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm font-medium mb-2">Payment Link Created</p>
                  <a
                    href={enrollmentData.paymentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-sm break-all"
                  >
                    {enrollmentData.paymentUrl}
                  </a>
                </div>
                <Button
                  className="w-full"
                  onClick={handleSendPaymentEmail}
                  disabled={isSendingEmail}
                >
                  {isSendingEmail ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending Email...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Send Payment Link to Student
                    </>
                  )}
                </Button>
              </>
            )}
        </div>

        {/* Payment Options */}
        <div className="space-y-4">
          <h4 className="text-lg font-semibold">Payment Options</h4>
          <div className="grid gap-3">
            <div className="flex items-center space-x-3 p-3 border rounded-lg">
              <input
                type="radio"
                id="full-payment"
                name="payment-option"
                value="full"
                className="h-4 w-4 text-primary"
                defaultChecked
              />
              <div className="flex-1">
                <Label htmlFor="full-payment" className="font-medium">Full Payment</Label>
                <p className="text-sm text-muted-foreground">Pay the full amount upfront</p>
              </div>
              <div className="text-right">
                <div className="font-semibold">${coursePrice + 50}</div>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 border rounded-lg">
              <input
                type="radio"
                id="installment"
                name="payment-option"
                value="installment"
                className="h-4 w-4 text-primary"
              />
              <div className="flex-1">
                <Label htmlFor="installment" className="font-medium">Installment Plan</Label>
                <p className="text-sm text-muted-foreground">Pay in 3 monthly installments</p>
              </div>
              <div className="text-right">
                <div className="font-semibold">${Math.ceil((coursePrice + 50) / 3)}/month</div>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Bypass (for testing/admin use) */}
        {enrollmentData.paymentStatus !== 'completed' && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="text-center">
              <h5 className="font-semibold text-gray-900 mb-2">Skip Payment (Admin Only)</h5>
              <p className="text-sm text-gray-700 mb-4">
                For testing purposes, you can skip payment processing.
              </p>
              <Button 
                variant="outline"
                onClick={() => {
                  updateEnrollmentData({ 
                    paymentMethod: "bypass",
                    paymentStatus: 'completed',
                    cardNumber: "N/A",
                    expiryDate: "N/A",
                    cvv: "N/A",
                    billingAddress: "N/A"
                  })
                  toast.success("Payment bypassed - proceeding to next step")
                  setTimeout(() => onNext(), 500)
                }}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Skip Payment & Continue
              </Button>
            </div>
          </div>
        )}

        <div className="flex justify-between space-x-4 pt-6">
          <Button variant="outline" onClick={onPrev}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Course Selection
          </Button>
          <Button 
            className="bg-primary hover:bg-primary/90"
            onClick={handleNext}
            disabled={!enrollmentData.paymentStatus && !enrollmentData.paymentUrl}
          >
            Continue to Document Upload
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
