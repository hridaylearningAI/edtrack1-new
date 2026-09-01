import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { ArrowRight, UserPlus } from "lucide-react"
import { EnrollmentData } from "../page"

interface StudentInfoStepProps {
  enrollmentData: EnrollmentData
  updateEnrollmentData: (data: Partial<EnrollmentData>) => void
  onNext: () => void
  onPrev: () => void
  currentStep: number
  totalSteps: number
}

export function StudentInfoStep({ 
  enrollmentData, 
  updateEnrollmentData, 
  onNext, 
  currentStep, 
  totalSteps 
}: StudentInfoStepProps) {
  const handleNext = () => {
    // Basic validation
    if (enrollmentData.firstName && enrollmentData.lastName && enrollmentData.email) {
      onNext()
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <UserPlus className="mr-2 h-5 w-5" />
          Step {currentStep}: Student Information
        </CardTitle>
        <CardDescription>Enter the student's basic information</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name *</Label>
            <Input 
              id="firstName" 
              placeholder="Enter first name" 
              value={enrollmentData.firstName}
              onChange={(e) => updateEnrollmentData({ firstName: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name *</Label>
            <Input 
              id="lastName" 
              placeholder="Enter last name" 
              value={enrollmentData.lastName}
              onChange={(e) => updateEnrollmentData({ lastName: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input 
              id="email" 
              type="email" 
              placeholder="student@example.com" 
              value={enrollmentData.email}
              onChange={(e) => updateEnrollmentData({ email: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number *</Label>
            <Input 
              id="phone" 
              placeholder="+1 (555) 123-4567" 
              value={enrollmentData.phone}
              onChange={(e) => updateEnrollmentData({ phone: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dob">Date of Birth *</Label>
            <Input 
              id="dob" 
              type="date" 
              value={enrollmentData.dateOfBirth}
              onChange={(e) => updateEnrollmentData({ dateOfBirth: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gender">Gender</Label>
            <Select 
              value={enrollmentData.gender}
              onValueChange={(value) => updateEnrollmentData({ gender: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
                <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <h4 className="text-lg font-semibold">Address Information</h4>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="address">Street Address *</Label>
              <Input 
                id="address" 
                placeholder="123 Main Street" 
                value={enrollmentData.address}
                onChange={(e) => updateEnrollmentData({ address: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City *</Label>
              <Input 
                id="city" 
                placeholder="New York" 
                value={enrollmentData.city}
                onChange={(e) => updateEnrollmentData({ city: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State/Province *</Label>
              <Input 
                id="state" 
                placeholder="NY" 
                value={enrollmentData.state}
                onChange={(e) => updateEnrollmentData({ state: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zipCode">ZIP/Postal Code *</Label>
              <Input 
                id="zipCode" 
                placeholder="10001" 
                value={enrollmentData.zipCode}
                onChange={(e) => updateEnrollmentData({ zipCode: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country *</Label>
              <Select 
                value={enrollmentData.country}
                onValueChange={(value) => updateEnrollmentData({ country: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="us">United States</SelectItem>
                  <SelectItem value="ca">Canada</SelectItem>
                  <SelectItem value="uk">United Kingdom</SelectItem>
                  <SelectItem value="au">Australia</SelectItem>
                  <SelectItem value="in">India</SelectItem>
                  <SelectItem value="de">Germany</SelectItem>
                  <SelectItem value="fr">France</SelectItem>
                  <SelectItem value="jp">Japan</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-4 pt-6">
          <Button variant="outline">Save Draft</Button>
          <Button 
            className="bg-primary hover:bg-primary/90"
            onClick={handleNext}
            disabled={!enrollmentData.firstName || !enrollmentData.lastName || !enrollmentData.email}
          >
            Continue to Course Selection
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
