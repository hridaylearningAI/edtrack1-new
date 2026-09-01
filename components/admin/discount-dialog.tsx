import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { DiscountCreate, DiscountUpdate } from '@/lib/api'
import { CourseSelectionDialog } from './course-selection-dialog'
import { StudentSelectionDialog } from './student-selection-dialog'
import { useCourses } from '@/lib/hooks/useCourses'
import { useStudents } from '@/lib/hooks/useStudents'
import { BookOpen, X, Users } from 'lucide-react'

interface DiscountDialogProps {
  discount?: DiscountUpdate
  onSubmit: (data: DiscountCreate | DiscountUpdate) => Promise<void>
  trigger?: React.ReactNode
}

const DISCOUNT_TYPES = [
  { value: 'percentage', label: 'Percentage' },
  { value: 'fixed_amount', label: 'Fixed Amount' },
  { value: 'free_course', label: 'Free Course' },
]

const DISCOUNT_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'expired', label: 'Expired' },
]

export function DiscountDialog({ discount, onSubmit, trigger }: DiscountDialogProps) {
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState<DiscountCreate>({
    name: '',
    description: '',
    discount_type: 'percentage',
    discount_value: 0,
    min_purchase_amount: undefined,
    max_discount_amount: undefined,
    usage_limit: undefined,
    start_date: undefined,
    end_date: undefined,
    status: 'active',
    is_one_time_use: false,
    is_student_specific: false,
    student_ids: undefined,
    course_ids: undefined,
    coupon_code: '',
  })
  const [loading, setLoading] = useState(false)
  const [selectedCourseIds, setSelectedCourseIds] = useState<number[]>([])
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([])
  const { courses } = useCourses()
  const { students } = useStudents()

  const isEditing = !!discount

  useEffect(() => {
    if (discount) {
      setFormData({
        name: discount.name || '',
        description: discount.description || '',
        discount_type: discount.discount_type || 'percentage',
        discount_value: discount.discount_value || 0,
        min_purchase_amount: discount.min_purchase_amount,
        max_discount_amount: discount.max_discount_amount,
        usage_limit: discount.usage_limit,
        start_date: discount.start_date,
        end_date: discount.end_date,
        status: discount.status || 'active',
        is_one_time_use: discount.is_one_time_use || false,
        is_student_specific: discount.is_student_specific || false,
        student_ids: discount.student_ids,
        course_ids: discount.course_ids,
        coupon_code: discount.coupon_code || '',
      })
      setSelectedCourseIds(discount.course_ids || [])
      setSelectedStudentIds(discount.student_ids || [])
    }
  }, [discount])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      return
    }

    setLoading(true)
    try {
      // Include selected course IDs and student IDs in the form data
      // For free_course type, discount_value is set to 100 (100% off) to satisfy database constraint
      // The backend will handle free_course specially regardless of this value
      const submissionData = {
        ...formData,
        discount_value: formData.discount_type === 'free_course' ? 100 : formData.discount_value,
        course_ids: selectedCourseIds.length > 0 ? selectedCourseIds : undefined,
        student_ids: formData.is_student_specific && selectedStudentIds.length > 0 ? selectedStudentIds : undefined
      }
      
      await onSubmit(submissionData)
      setOpen(false)
      // Reset form
      setFormData({
        name: '',
        description: '',
        discount_type: 'percentage',
        discount_value: 0,
        min_purchase_amount: undefined,
        max_discount_amount: undefined,
        usage_limit: undefined,
        start_date: undefined,
        end_date: undefined,
        status: 'active',
        is_one_time_use: false,
        is_student_specific: false,
        student_ids: undefined,
        course_ids: undefined,
        coupon_code: '',
      })
      setSelectedCourseIds([])
      setSelectedStudentIds([])
    } catch (error) {
      console.error('Form submission failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof DiscountCreate, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }))
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="bg-primary hover:bg-primary/90">
            Create Discount
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Discount' : 'Create New Discount'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update discount details' : 'Create a new discount code for courses'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Discount Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="e.g., Summer Sale"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="coupon_code">Coupon Code *</Label>
              <Input
                id="coupon_code"
                value={formData.coupon_code}
                onChange={(e) => handleInputChange('coupon_code', e.target.value.toUpperCase())}
                placeholder="e.g., SUMMER20"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe the discount..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="discount_type">Discount Type *</Label>
              <Select
                value={formData.discount_type}
                onValueChange={(value) => handleInputChange('discount_type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {DISCOUNT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="discount_value">
                Discount Value * 
                {formData.discount_type === 'free_course' && (
                  <span className="text-xs text-muted-foreground ml-2">(Not applicable for free course)</span>
                )}
              </Label>
              <Input
                id="discount_value"
                type="number"
                min="0"
                step="0.01"
                value={formData.discount_value}
                onChange={(e) => handleInputChange('discount_value', parseFloat(e.target.value) || 0)}
                placeholder={
                  formData.discount_type === 'percentage' 
                    ? '20' 
                    : formData.discount_type === 'fixed_amount'
                    ? '50'
                    : '0'
                }
                required={formData.discount_type !== 'free_course'}
                disabled={formData.discount_type === 'free_course'}
                className={formData.discount_type === 'free_course' ? 'bg-muted cursor-not-allowed' : ''}
              />
              {formData.discount_type === 'free_course' && (
                <p className="text-xs text-muted-foreground">
                  Free course discount will make the selected course(s) completely free (100% discount)
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="min_purchase_amount">Minimum Purchase Amount</Label>
              <Input
                id="min_purchase_amount"
                type="number"
                min="0"
                step="0.01"
                value={formData.min_purchase_amount || ''}
                onChange={(e) => handleInputChange('min_purchase_amount', e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="e.g., 100"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_discount_amount">Maximum Discount Amount</Label>
              <Input
                id="max_discount_amount"
                type="number"
                min="0"
                step="0.01"
                value={formData.max_discount_amount || ''}
                onChange={(e) => handleInputChange('max_discount_amount', e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="e.g., 200"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="usage_limit">Usage Limit</Label>
              <Input
                id="usage_limit"
                type="number"
                min="1"
                value={formData.usage_limit || ''}
                onChange={(e) => handleInputChange('usage_limit', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="e.g., 100"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleInputChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {DISCOUNT_STATUSES.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date & Time (Seasonal)</Label>
              <Input
                id="start_date"
                type="datetime-local"
                value={formData.start_date ? new Date(formData.start_date).toISOString().slice(0, 16) : ''}
                onChange={(e) => handleInputChange('start_date', e.target.value ? new Date(e.target.value).toISOString() : undefined)}
              />
              <p className="text-xs text-muted-foreground">Leave empty for no start date restriction</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date">End Date & Time (Seasonal)</Label>
              <Input
                id="end_date"
                type="datetime-local"
                value={formData.end_date ? new Date(formData.end_date).toISOString().slice(0, 16) : ''}
                onChange={(e) => handleInputChange('end_date', e.target.value ? new Date(e.target.value).toISOString() : undefined)}
              />
              <p className="text-xs text-muted-foreground">Leave empty for no end date restriction</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="is_one_time_use"
                checked={formData.is_one_time_use}
                onCheckedChange={(checked) => handleInputChange('is_one_time_use', checked)}
              />
              <Label htmlFor="is_one_time_use">One-time use per student</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_student_specific"
                checked={formData.is_student_specific}
                onCheckedChange={(checked) => {
                  handleInputChange('is_student_specific', checked)
                  if (!checked) {
                    setSelectedStudentIds([])
                  }
                }}
              />
              <Label htmlFor="is_student_specific">Student-specific discount</Label>
            </div>
          </div>

          {/* Student Selection */}
          {formData.is_student_specific && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Student Selection</Label>
              <div className="space-y-2">
                <StudentSelectionDialog
                  selectedStudentIds={selectedStudentIds}
                  onSelectionChange={setSelectedStudentIds}
                  trigger={
                    <Button variant="outline" type="button" className="w-full justify-start">
                      <Users className="mr-2 h-4 w-4" />
                      {selectedStudentIds.length === 0 
                        ? 'Select students (required for student-specific discounts)' 
                        : `${selectedStudentIds.length} student(s) selected`
                      }
                    </Button>
                  }
                />
                
                {/* Display selected students */}
                {selectedStudentIds.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Selected Students:</Label>
                    <div className="flex flex-wrap gap-2">
                      {selectedStudentIds.map((studentId) => {
                        const student = students.find(s => s.id === studentId)
                        return student ? (
                          <Badge key={studentId} variant="secondary" className="text-xs">
                            {student.name || student.email}
                            <button
                              type="button"
                              onClick={() => setSelectedStudentIds(prev => prev.filter(id => id !== studentId))}
                              className="ml-1 hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ) : null
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Course Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Course Selection</Label>
            <div className="space-y-2">
              <CourseSelectionDialog
                selectedCourseIds={selectedCourseIds}
                onSelectionChange={setSelectedCourseIds}
                trigger={
                  <Button variant="outline" type="button" className="w-full justify-start">
                    <BookOpen className="mr-2 h-4 w-4" />
                    {selectedCourseIds.length === 0 
                      ? 'Select courses (optional - applies to all if none selected)' 
                      : `${selectedCourseIds.length} course(s) selected`
                    }
                  </Button>
                }
              />
              
              {/* Display selected courses */}
              {selectedCourseIds.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Selected Courses:</Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedCourseIds.map((courseId) => {
                      const course = courses.find(c => c.id === courseId)
                      return course ? (
                        <Badge key={courseId} variant="secondary" className="text-xs">
                          {course.name}
                          <button
                            type="button"
                            onClick={() => setSelectedCourseIds(prev => prev.filter(id => id !== courseId))}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ) : null
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.name.trim() || !formData.coupon_code.trim()}>
              {loading ? 'Saving...' : isEditing ? 'Update Discount' : 'Create Discount'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
