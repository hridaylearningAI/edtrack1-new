import React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CourseStatus } from './course-status-badge'

interface CourseStatusFilterProps {
  value?: CourseStatus | 'all'
  onValueChange: (value: CourseStatus | 'all') => void
  className?: string
  placeholder?: string
  /** Hide the draft option (e.g. for student-facing pages where drafts are not displayed) */
  hideDraft?: boolean
}

export function CourseStatusFilter({ 
  value = 'all', 
  onValueChange, 
  className = '',
  placeholder = 'Filter by status',
  hideDraft = false
}: CourseStatusFilterProps) {
  const statusOptions = [
    { value: 'all', label: 'All Courses' },
    { value: 'live', label: 'Available Now' },
    { value: 'coming_soon', label: 'Coming Soon' },
    { value: 'archived', label: 'Archived' },
    ...(hideDraft ? [] : [{ value: 'draft', label: 'Draft' }])
  ]

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={`w-[180px] ${className}`}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {statusOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// Utility function to get status count
export function getStatusCount(courses: any[], status: CourseStatus | 'all'): number {
  if (status === 'all') {
    return courses.length
  }
  return courses.filter(course => course.course_status === status).length
}

// Utility function to get status distribution
export function getStatusDistribution(courses: any[]) {
  const distribution = {
    all: courses.length,
    live: 0,
    coming_soon: 0,
    archived: 0,
    draft: 0
  }

  courses.forEach(course => {
    const status = course.course_status || 'live'
    if (status in distribution) {
      distribution[status as keyof typeof distribution]++
    }
  })

  return distribution
}
