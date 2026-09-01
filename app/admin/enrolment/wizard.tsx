"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, ArrowRight, ArrowLeft, UserPlus, BookOpen, CreditCard, FileText, CheckSquare } from "lucide-react"
import { StudentInfoStep } from "./components/student-info-step"
import { CourseSelectionStep } from "./components/course-selection-step"
import { PaymentStep } from "./components/payment-step"
import { DocumentUploadStep } from "./components/document-upload-step"
import { ReviewStep } from "./components/review-step"

export interface EnrollmentData {
  // Student Information
  firstName: string
  lastName: string
  email: string
  phone: string
  dateOfBirth: string
  gender: string
  address: string
  city: string
  state: string
  zipCode: string
  country: string
  
  // Course Selection
  selectedCourse: any
  startDate: string
  schedule: string
  
  // Payment
  paymentMethod: string
  cardNumber: string
  expiryDate: string
  cvv: string
  billingAddress: string
  paymentStatus?: 'pending' | 'completed' | 'failed'
  paymentSessionId?: string
  paymentUrl?: string
  
  // Documents
  documents: File[]
  uploadedDocumentIds?: number[]
  
  // Enrollment
  enrollmentId?: number
  studentId?: number
  
  // Review
  termsAccepted: boolean
  privacyAccepted: boolean
}

const enrollmentSteps = [
  { 
    id: 1, 
    title: "Student Information", 
    description: "Basic student details", 
    icon: UserPlus,
    component: StudentInfoStep 
  },
  { 
    id: 2, 
    title: "Course Selection", 
    description: "Choose course and schedule", 
    icon: BookOpen,
    component: CourseSelectionStep 
  },
  { 
    id: 3, 
    title: "Payment Details", 
    description: "Payment method and billing", 
    icon: CreditCard,
    component: PaymentStep 
  },
  { 
    id: 4, 
    title: "Document Upload", 
    description: "Required documents", 
    icon: FileText,
    component: DocumentUploadStep 
  },
  { 
    id: 5, 
    title: "Review & Confirm", 
    description: "Final review and enrollment", 
    icon: CheckSquare,
    component: ReviewStep 
  },
]

export default function EnrolmentWizardPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [enrollmentData, setEnrollmentData] = useState<EnrollmentData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    gender: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    country: "",
    selectedCourse: null,
    startDate: "",
    schedule: "",
    paymentMethod: "",
    cardNumber: "",
    expiryDate: "",
    cvv: "",
    billingAddress: "",
    documents: [],
    uploadedDocumentIds: [],
    paymentStatus: undefined,
    termsAccepted: false,
    privacyAccepted: false,
  })

  const updateEnrollmentData = (data: Partial<EnrollmentData>) => {
    setEnrollmentData(prev => ({ ...prev, ...data }))
  }

  const nextStep = () => {
    if (currentStep < enrollmentSteps.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const goToStep = (step: number) => {
    setCurrentStep(step)
  }

  const isStepCompleted = (stepId: number) => {
    // Add validation logic for each step
    switch (stepId) {
      case 1:
        return enrollmentData.firstName && enrollmentData.lastName && enrollmentData.email
      case 2:
        return enrollmentData.selectedCourse
      case 3:
        return enrollmentData.paymentMethod && enrollmentData.cardNumber
      case 4:
        // Documents are optional, so step is always considered complete
        return true
      case 5:
        return enrollmentData.termsAccepted && enrollmentData.privacyAccepted
      default:
        return false
    }
  }

  const CurrentStepComponent = enrollmentSteps[currentStep - 1].component

  return (
          <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-foreground">Enrolment Wizard</h2>
            <p className="text-muted-foreground mt-2">Guide students through the enrollment process</p>
          </div>
          <Button 
            className="bg-primary hover:bg-primary/90"
            onClick={() => setCurrentStep(1)}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Start New Enrollment
          </Button>
        </div>

        {/* Enrollment Progress */}
        <Card>
          <CardHeader>
            <CardTitle>Enrollment Progress</CardTitle>
            <CardDescription>Track the current enrollment process</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-6">
              {enrollmentSteps.map((step, index) => {
                const Icon = step.icon
                const isCompleted = isStepCompleted(step.id)
                const isCurrent = currentStep === step.id
                
                return (
                  <div key={step.id} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <button
                        onClick={() => goToStep(step.id)}
                        className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-200 ${
                          isCompleted
                            ? "bg-green-500 border-green-500 text-white hover:bg-green-600"
                            : isCurrent
                              ? "bg-primary border-primary text-white"
                              : "bg-muted border-muted-foreground text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {isCompleted ? <CheckCircle className="h-6 w-6" /> : <Icon className="h-5 w-5" />}
                      </button>
                      <div className="text-center mt-2 max-w-[120px]">
                        <div className="text-sm font-medium leading-tight">{step.title}</div>
                        <div className="text-xs text-muted-foreground mt-1">{step.description}</div>
                      </div>
                    </div>
                    {index < enrollmentSteps.length - 1 && (
                      <ArrowRight className="h-4 w-4 text-muted-foreground mx-4 mt-[-2rem]" />
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Current Step Content */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <CurrentStepComponent 
              enrollmentData={enrollmentData}
              updateEnrollmentData={updateEnrollmentData}
              onNext={nextStep}
              onPrev={prevStep}
              currentStep={currentStep}
              totalSteps={enrollmentSteps.length}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Progress Summary</CardTitle>
                <CardDescription>Current enrollment status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {enrollmentSteps.map((step) => {
                    const isCompleted = isStepCompleted(step.id)
                    const isCurrent = currentStep === step.id
                    
                    return (
                      <div key={step.id} className="flex items-center space-x-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                          isCompleted 
                            ? "bg-green-500 text-white" 
                            : isCurrent 
                              ? "bg-primary text-white"
                              : "bg-muted text-muted-foreground"
                        }`}>
                          {isCompleted ? <CheckCircle className="h-3 w-3" /> : step.id}
                        </div>
                        <div className="flex-1">
                          <div className={`text-sm font-medium ${
                            isCurrent ? "text-primary" : isCompleted ? "text-green-600" : "text-muted-foreground"
                          }`}>
                            {step.title}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start"
                    onClick={() => setCurrentStep(1)}
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    New Enrollment
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    View Templates
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start"
                  >
                    <CheckSquare className="mr-2 h-4 w-4" />
                    Bulk Import
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
  )
}
