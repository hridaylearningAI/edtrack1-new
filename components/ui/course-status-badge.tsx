import React from 'react'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Clock, Archive, Edit, HelpCircle } from 'lucide-react'

export type CourseStatus = 'live' | 'coming_soon' | 'archived' | 'draft'

interface CourseStatusBadgeProps {
  status: CourseStatus
  className?: string
  showIcon?: boolean
}

export function CourseStatusBadge({ 
  status, 
  className = '', 
  showIcon = true 
}: CourseStatusBadgeProps) {
  const getStatusConfig = (status: CourseStatus) => {
    switch (status) {
      case 'live':
        return {
          text: 'Available Now',
          variant: 'default' as const,
          className: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200',
          icon: CheckCircle,
          iconColor: 'text-green-600'
        }
      case 'coming_soon':
        return {
          text: 'Coming Soon',
          variant: 'secondary' as const,
          className: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200',
          icon: Clock,
          iconColor: 'text-blue-600'
        }
      case 'archived':
        return {
          text: 'Archived',
          variant: 'outline' as const,
          className: 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200',
          icon: Archive,
          iconColor: 'text-gray-600'
        }
      case 'draft':
        return {
          text: 'Draft',
          variant: 'outline' as const,
          className: 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200',
          icon: Edit,
          iconColor: 'text-yellow-600'
        }
      default:
        return {
          text: 'Unknown',
          variant: 'outline' as const,
          className: 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200',
          icon: HelpCircle,
          iconColor: 'text-gray-600'
        }
    }
  }

  const config = getStatusConfig(status)
  const Icon = config.icon

  return (
    <Badge 
      variant={config.variant}
      className={`${config.className} ${className} flex items-center gap-1.5 px-2.5 py-1`}
    >
      {showIcon && <Icon className={`h-3 w-3 ${config.iconColor}`} />}
      <span className="text-xs font-medium">{config.text}</span>
    </Badge>
  )
}

// Utility function to get status information
export function getCourseStatusInfo(status: CourseStatus) {
  const configs = {
    live: {
      text: 'Available Now',
      color: 'green',
      icon: 'check-circle',
      description: 'This course is currently available for enrollment and purchase.',
      canPurchase: true
    },
    coming_soon: {
      text: 'Coming Soon',
      color: 'blue',
      icon: 'clock',
      description: 'This course will be available soon. Stay tuned for updates!',
      canPurchase: false
    },
    archived: {
      text: 'Archived',
      color: 'gray',
      icon: 'archive',
      description: 'This course is no longer available for new enrollments.',
      canPurchase: false
    },
    draft: {
      text: 'Draft',
      color: 'yellow',
      icon: 'edit',
      description: 'This course is currently being developed and is not yet available.',
      canPurchase: false
    }
  }

  return configs[status] || configs.live
}

// Utility function to check if course can be purchased
export function canPurchaseCourse(status: CourseStatus): boolean {
  return status === 'live'
}

// Utility function to get purchase button text
export function getPurchaseButtonText(status: CourseStatus): string {
  switch (status) {
    case 'live':
      return 'Enroll Now'
    case 'coming_soon':
      return 'Coming Soon'
    case 'archived':
      return 'Archived'
    case 'draft':
      return 'In Development'
    default:
      return 'Unavailable'
  }
}
