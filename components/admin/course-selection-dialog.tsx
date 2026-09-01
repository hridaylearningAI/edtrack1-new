import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Search, X, BookOpen, Users, DollarSign } from 'lucide-react'
import { Course } from '@/lib/api'
import { useCourses } from '@/lib/hooks/useCourses'

interface CourseSelectionDialogProps {
  selectedCourseIds: number[]
  onSelectionChange: (courseIds: number[]) => void
  trigger?: React.ReactNode
}

export function CourseSelectionDialog({ selectedCourseIds, onSelectionChange, trigger }: CourseSelectionDialogProps) {
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [localSelection, setLocalSelection] = useState<number[]>(selectedCourseIds)
  
  const { courses, loading, fetchCourses } = useCourses()

  useEffect(() => {
    if (open) {
      fetchCourses()
    }
  }, [open, fetchCourses])

  useEffect(() => {
    setLocalSelection(selectedCourseIds)
  }, [selectedCourseIds])

  const handleSave = () => {
    onSelectionChange(localSelection)
    setOpen(false)
  }

  const handleCancel = () => {
    setLocalSelection(selectedCourseIds)
    setOpen(false)
  }

  const handleCourseToggle = (courseId: number) => {
    setLocalSelection(prev => 
      prev.includes(courseId) 
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    )
  }

  const handleSelectAll = () => {
    setLocalSelection(courses.map(course => course.id))
  }

  const handleClearAll = () => {
    setLocalSelection([])
  }

  const filteredCourses = courses.filter(course =>
    course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active":
        return <Badge variant="default" className="bg-green-600 text-white text-xs">Active</Badge>
      case "inactive":
        return <Badge variant="secondary" className="text-xs">Inactive</Badge>
      case "draft":
        return <Badge variant="outline" className="text-xs">Draft</Badge>
      case "archived":
        return <Badge variant="outline" className="text-xs">Archived</Badge>
      default:
        return <Badge variant="outline" className="text-xs">{status || 'Unknown'}</Badge>
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <BookOpen className="mr-2 h-4 w-4" />
            Select Courses
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select Courses for Discount</DialogTitle>
          <DialogDescription>
            Choose which courses this discount will apply to. Leave empty to apply to all courses.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search courses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Selection Actions */}
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={handleSelectAll}>
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={handleClearAll}>
                Clear All
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              {localSelection.length} of {courses.length} selected
            </div>
          </div>

          {/* Course List */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-muted-foreground">Loading courses...</p>
                </div>
              </div>
            ) : filteredCourses.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No courses found</p>
              </div>
            ) : (
              filteredCourses.map((course) => (
                <div
                  key={course.id}
                  className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    localSelection.includes(course.id)
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted/50'
                  }`}
                  onClick={() => handleCourseToggle(course.id)}
                >
                  <Checkbox
                    checked={localSelection.includes(course.id)}
                    onChange={() => handleCourseToggle(course.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm truncate">{course.name}</h4>
                      <div className="flex items-center space-x-2">
                        {course.price && (
                          <div className="flex items-center text-xs text-muted-foreground">
                            <DollarSign className="h-3 w-3 mr-1" />
                            {course.price}
                          </div>
                        )}
                        {getStatusBadge(course.status || 'unknown')}
                      </div>
                    </div>
                    {course.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {course.description}
                      </p>
                    )}
                    <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
                      {course.students_enrolled !== undefined && (
                        <div className="flex items-center">
                          <Users className="h-3 w-3 mr-1" />
                          {course.students_enrolled} enrolled
                        </div>
                      )}
                      {course.active_enrollments !== undefined && (
                        <div className="flex items-center">
                          <BookOpen className="h-3 w-3 mr-1" />
                          {course.active_enrollments} active
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Selection ({localSelection.length} courses)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
