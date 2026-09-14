import { useEffect, useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, ArrowLeft, BookOpen, Clock, DollarSign, Loader2, Search } from "lucide-react"
import { EnrollmentData } from "../page"
import { useCourses } from "@/lib/hooks/useCourses"

interface CourseSelectionStepProps {
  enrollmentData: EnrollmentData
  updateEnrollmentData: (data: Partial<EnrollmentData>) => void
  onNext: () => void
  onPrev: () => void
  currentStep: number
  totalSteps: number
}

export function CourseSelectionStep({ 
  enrollmentData, 
  updateEnrollmentData, 
  onNext, 
  onPrev, 
  currentStep, 
  totalSteps 
}: CourseSelectionStepProps) {
  const { courses, loading, error, fetchCourses } = useCourses()
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    fetchCourses()
  }, [fetchCourses])

  // Filter courses based on search query
  const filteredCourses = useMemo(() => {
    if (!searchQuery.trim()) {
      return courses
    }
    
    const query = searchQuery.toLowerCase()
    return courses.filter(course => 
      course.name?.toLowerCase().includes(query) ||
      course.description?.toLowerCase().includes(query) ||
      course.id?.toString().includes(query)
    )
  }, [courses, searchQuery])

  const handleNext = () => {
    if (enrollmentData.selectedCourse) {
      onNext()
    }
  }

  const selectedCourse = courses.find(course => course.id === enrollmentData.selectedCourse?.id)

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BookOpen className="mr-2 h-5 w-5" />
            Step {currentStep}: Course Selection
          </CardTitle>
          <CardDescription>Loading available courses...</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading courses...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BookOpen className="mr-2 h-5 w-5" />
            Step {currentStep}: Course Selection
          </CardTitle>
          <CardDescription>Error loading courses</CardDescription>
        </CardHeader>
        <CardContent className="py-12">
          <div className="text-center text-destructive">
            <p>Failed to load courses: {error}</p>
            <Button 
              variant="outline" 
              onClick={() => fetchCourses()}
              className="mt-4"
            >
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <BookOpen className="mr-2 h-5 w-5" />
          Step {currentStep}: Course Selection
        </CardTitle>
        <CardDescription>Search and select a course for enrollment</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Course Selection */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-semibold">Available Courses</h4>
            <Badge variant="outline">{filteredCourses.length} course{filteredCourses.length !== 1 ? 's' : ''}</Badge>
          </div>
          
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search courses by name, description, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="grid gap-4">
            {filteredCourses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>
                  {searchQuery ? `No courses found matching "${searchQuery}"` : "No courses available at the moment."}
                </p>
                {searchQuery && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSearchQuery("")}
                    className="mt-4"
                  >
                    Clear Search
                  </Button>
                )}
              </div>
            ) : (
              filteredCourses.map((course) => (
                <div
                  key={course.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
                    enrollmentData.selectedCourse?.id === course.id
                      ? "border-primary bg-primary/5"
                      : "border-muted hover:border-primary/50"
                  }`}
                  onClick={() => updateEnrollmentData({ selectedCourse: course })}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h5 className="font-semibold text-lg">{course.name}</h5>
                        <Badge variant="outline">#{course.id}</Badge>
                        {course.status && (
                          <Badge variant={course.status === 'active' ? 'default' : 'secondary'}>
                            {course.status}
                          </Badge>
                        )}
                      </div>
                      {course.description && (
                        <p className="text-muted-foreground mb-3">{course.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {course.price && (
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            ${course.price}
                          </div>
                        )}
                        {course.students_enrolled !== undefined && (
                          <div className="flex items-center gap-1">
                            <BookOpen className="h-4 w-4" />
                            {course.students_enrolled} enrolled
                          </div>
                        )}
                        {course.average_progress !== undefined && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {course.average_progress}% avg progress
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      {course.price && (
                        <div className="text-2xl font-medium tracking-tight text-primary">${course.price}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Course Summary */}
        {selectedCourse && (
          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-semibold mb-3">Selected Course Summary</h4>
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span>Course:</span>
                <span className="font-medium">{selectedCourse.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Course ID:</span>
                <span className="font-medium">#{selectedCourse.id}</span>
              </div>
              {selectedCourse.description && (
                <div className="flex justify-between">
                  <span>Description:</span>
                  <span className="font-medium max-w-[200px] text-right">{selectedCourse.description}</span>
                </div>
              )}
              {selectedCourse.price && (
                <div className="flex justify-between">
                  <span>Price:</span>
                  <span className="font-medium text-primary">${selectedCourse.price}</span>
                </div>
              )}
              {selectedCourse.students_enrolled !== undefined && (
                <div className="flex justify-between">
                  <span>Students Enrolled:</span>
                  <span className="font-medium">{selectedCourse.students_enrolled}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-between space-x-4 pt-6">
          <Button variant="outline" onClick={onPrev}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Student Information
          </Button>
          <Button 
            className="bg-primary hover:bg-primary/90"
            onClick={handleNext}
            disabled={!enrollmentData.selectedCourse}
          >
            Continue to Payment Details
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
