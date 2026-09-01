import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CourseForm } from './course-form'
import { CourseCreate, CourseUpdate } from '@/lib/api'
import { Plus, Edit } from 'lucide-react'

interface CourseDialogProps {
  course?: CourseUpdate
  onSubmit: (data: CourseCreate | CourseUpdate) => Promise<void>
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function CourseDialog({ course, onSubmit, trigger, open: controlledOpen, onOpenChange }: CourseDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // Use controlled open if provided, otherwise use internal state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = onOpenChange || setInternalOpen

  const isEditing = !!course

  // Auto-open dialog when course is provided (for edit mode)
  useEffect(() => {
    if (course && controlledOpen === undefined) {
      setInternalOpen(true)
    }
  }, [course, controlledOpen])

  const handleSubmit = async (data: CourseCreate | CourseUpdate) => {
    setLoading(true)
    try {
      await onSubmit(data)
      setOpen(false)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
      ) : !isEditing ? (
        <DialogTrigger asChild>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Course
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Course' : 'Add New Course'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Update the course information below.'
              : 'Fill in the course details to create a new course.'
            }
          </DialogDescription>
        </DialogHeader>
        <CourseForm
          course={course}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          loading={loading}
        />
      </DialogContent>
    </Dialog>
  )
}
