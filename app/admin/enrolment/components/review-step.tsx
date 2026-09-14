import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, CheckSquare, User, BookOpen, CreditCard, FileText, CheckCircle, Loader2 } from "lucide-react"
import { EnrollmentData } from "../page"
import { Label } from "@/components/ui/label"
import { useEnrollments } from "@/lib/hooks/useEnrollments"
import { useStudents } from "@/lib/hooks/useStudents"
import { useUser } from "@/lib/hooks/useUser"
import { toast } from "sonner"

interface ReviewStepProps {
  enrollmentData: EnrollmentData
  updateEnrollmentData: (data: Partial<EnrollmentData>) => void
  onNext: () => void
  onPrev: () => void
  currentStep: number
  totalSteps: number
}

export function ReviewStep({ 
  enrollmentData, 
  updateEnrollmentData, 
  onNext, 
  onPrev, 
  currentStep, 
  totalSteps 
}: ReviewStepProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { getAccessToken } = useUser()
  const { createEnrollment } = useEnrollments()
  const { createStudent } = useStudents()

  const selectedCourse = enrollmentData.selectedCourse
  const coursePrice = selectedCourse?.price || 0
  const totalAmount = coursePrice + 50

  const handleSubmit = async () => {
    if (!enrollmentData.termsAccepted || !enrollmentData.privacyAccepted) {
      toast.error("Please accept the terms and conditions")
      return
    }

    if (!selectedCourse) {
      toast.error("Please select a course")
      return
    }

    // Check if enrollment already exists (created in payment step)
    if (!enrollmentData.enrollmentId) {
      toast.error("Please complete payment step first to create enrollment")
      return
    }

    setIsSubmitting(true)

    try {
      const token = await getAccessToken()

      // If payment is completed, finalize enrollment and send welcome email
      if (enrollmentData.paymentStatus === 'completed') {
        // Send welcome email with credentials
        try {
          const welcomeEmailResponse = await fetch('/api/enrollments/send-welcome-email', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              enrollmentId: enrollmentData.enrollmentId,
              studentId: enrollmentData.studentId,
              courseId: selectedCourse.id,
              studentEmail: enrollmentData.email,
              studentName: `${enrollmentData.firstName} ${enrollmentData.lastName}`,
              courseName: selectedCourse.name,
            }),
          })

          if (welcomeEmailResponse.ok) {
            const welcomeData = await welcomeEmailResponse.json()
            if (welcomeData.success) {
              toast.success("Welcome email with credentials sent to student")
            } else {
              console.warn("Welcome email failed, but enrollment is complete")
            }
          } else {
            console.warn("Welcome email failed, but enrollment is complete")
          }
        } catch (emailError) {
          console.error('Welcome email error:', emailError)
          // Don't fail the enrollment if email fails
        }

        toast.success("Enrollment completed successfully!")
        
        // Redirect to enrollment page
        setTimeout(() => {
          window.location.href = "/admin/enrolment"
        }, 2000)
      } else if (enrollmentData.paymentStatus === 'pending') {
        // Payment is pending, just confirm the enrollment setup
        toast.success("Enrollment setup completed! Waiting for payment confirmation.")
        toast.info("Student will be enrolled automatically once payment is completed.")
        
        setTimeout(() => {
          window.location.href = "/admin/enrolment"
        }, 2000)
      } else {
        // Payment not completed, show warning
        toast.warning("Payment not completed. Enrollment will be activated once payment is received.")
        
        setTimeout(() => {
          window.location.href = "/admin/enrolment"
        }, 2000)
      }

    } catch (error) {
      console.error('Enrollment submission error:', error)
      toast.error("Failed to complete enrollment. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <CheckSquare className="mr-2 h-5 w-5" />
          Step {currentStep}: Review & Confirm
        </CardTitle>
        <CardDescription>Review all information before finalizing enrollment</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Student Information Review */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <h4 className="text-lg font-semibold">Student Information</h4>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Full Name</div>
              <div className="font-medium">{enrollmentData.firstName} {enrollmentData.lastName}</div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Email</div>
              <div className="font-medium">{enrollmentData.email}</div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Phone</div>
              <div className="font-medium">{enrollmentData.phone}</div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Date of Birth</div>
              <div className="font-medium">{enrollmentData.dateOfBirth}</div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Address</div>
              <div className="font-medium">
                {enrollmentData.address}, {enrollmentData.city}, {enrollmentData.state} {enrollmentData.zipCode}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Country</div>
              <div className="font-medium">{enrollmentData.country}</div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Course Information Review */}
        {selectedCourse && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <h4 className="text-lg font-semibold">Course Information</h4>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Course Name</div>
                <div className="font-medium">{selectedCourse.name}</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Course ID</div>
                <div className="font-medium">#{selectedCourse.id}</div>
              </div>
              {selectedCourse.description && (
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Description</div>
                  <div className="font-medium max-w-[200px]">{selectedCourse.description}</div>
                </div>
              )}
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Start Date</div>
                <div className="font-medium">{new Date(enrollmentData.startDate).toLocaleDateString()}</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Schedule</div>
                <div className="font-medium">{enrollmentData.schedule}</div>
              </div>
            </div>
          </div>
        )}

        <Separator />

        {/* Payment Information Review */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <h4 className="text-lg font-semibold">Payment Information</h4>
          </div>
          
          {/* Payment Status */}
          {enrollmentData.paymentStatus && (
            <div className={`p-4 rounded-lg border ${
              enrollmentData.paymentStatus === 'completed' 
                ? 'bg-success-soft border-success-line' 
                : enrollmentData.paymentStatus === 'failed'
                ? 'bg-destructive-soft border-destructive-line'
                : 'bg-warning-soft border-warning-line'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className={`font-semibold ${
                    enrollmentData.paymentStatus === 'completed' 
                      ? 'text-success' 
                      : enrollmentData.paymentStatus === 'failed'
                      ? 'text-destructive'
                      : 'text-warning'
                  }`}>
                    Payment Status: {enrollmentData.paymentStatus.toUpperCase()}
                  </div>
                  {enrollmentData.paymentStatus === 'pending' && (
                    <p className="text-sm text-warning mt-1">
                      Waiting for student to complete payment
                    </p>
                  )}
                  {enrollmentData.paymentStatus === 'completed' && (
                    <p className="text-sm text-success mt-1">
                      Payment completed successfully
                    </p>
                  )}
                </div>
                {enrollmentData.paymentStatus === 'completed' && (
                  <CheckCircle className="h-6 w-6 text-success" />
                )}
              </div>
            </div>
          )}
          
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Payment Method</div>
              <div className="font-medium">{enrollmentData.paymentMethod || 'Stripe'}</div>
            </div>
            {enrollmentData.enrollmentId && (
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Enrollment ID</div>
                <div className="font-medium">#{enrollmentData.enrollmentId}</div>
              </div>
            )}
          </div>
          
          {/* Payment Summary */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <h5 className="font-semibold mb-3">Payment Summary</h5>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Course Fee:</span>
                <span>${coursePrice}</span>
              </div>
              <div className="flex justify-between">
                <span>Registration Fee:</span>
                <span>$50</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between font-semibold text-lg">
                <span>Total Amount:</span>
                <span className="text-primary">${totalAmount}</span>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Documents Review */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h4 className="text-lg font-semibold">Uploaded Documents</h4>
          </div>
          <div className="space-y-2">
            {enrollmentData.documents.length > 0 ? (
              enrollmentData.documents.map((doc, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span className="text-sm">{doc.name}</span>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">No documents uploaded</div>
            )}
          </div>
        </div>

        <Separator />

        {/* Terms and Conditions */}
        <div className="space-y-4">
          <h4 className="text-lg font-semibold">Terms & Conditions</h4>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="terms" 
                checked={enrollmentData.termsAccepted}
                onCheckedChange={(checked) => 
                  updateEnrollmentData({ termsAccepted: checked as boolean })
                }
              />
              <Label htmlFor="terms" className="text-sm">
                I agree to the <a href="#" className="text-primary hover:underline">Terms and Conditions</a>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="privacy" 
                checked={enrollmentData.privacyAccepted}
                onCheckedChange={(checked) => 
                  updateEnrollmentData({ privacyAccepted: checked as boolean })
                }
              />
              <Label htmlFor="privacy" className="text-sm">
                I agree to the <a href="#" className="text-primary hover:underline">Privacy Policy</a>
              </Label>
            </div>
          </div>
        </div>

        {/* Final Confirmation */}
        <div className="bg-success-soft border border-success-line rounded-lg p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-success mt-0.5" />
            <div>
              <h5 className="font-semibold text-success">Ready to Complete Enrollment</h5>
              <p className="text-sm text-success mt-1">
                Please review all information above carefully. Once you submit, your enrollment will be processed 
                and you'll receive a confirmation email with further instructions.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-between space-x-4 pt-6">
          <Button variant="outline" onClick={onPrev}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Document Upload
          </Button>
          <Button 
            className="bg-primary hover:bg-primary/90"
            onClick={handleSubmit}
            disabled={!enrollmentData.termsAccepted || !enrollmentData.privacyAccepted || isSubmitting || !enrollmentData.enrollmentId}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                {enrollmentData.paymentStatus === 'completed' ? 'Complete Enrollment' : 'Confirm Enrollment Setup'}
                <CheckCircle className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
