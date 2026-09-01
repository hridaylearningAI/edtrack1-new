import React from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CourseStatusBadge, canPurchaseCourse, getPurchaseButtonText } from './course-status-badge'
import { PurchaseDialog } from './purchase-dialog'
import { Course } from '@/lib/api'
import { BookOpen, Clock, ShoppingCart, Eye, Heart } from 'lucide-react'

interface CourseCardProps {
  course: Course
  onViewDetails?: (course: Course) => void
  onAddToCart?: (course: Course) => void
  onEnroll?: (course: Course) => void
  showActions?: boolean
  className?: string
  /** When true, purchase button redirects to portfolio instead of opening PurchaseDialog */
  redirectToPortfolio?: boolean
  /** Callback when user clicks Show Interest (for category 5 and 7 courses) */
  onShowInterest?: (course: Course) => void
  /** Whether user has already shown interest (for category 5 and 7 courses) */
  hasShownInterest?: (courseId: number) => boolean
}

export function CourseCard({ 
  course, 
  onViewDetails, 
  onAddToCart, 
  onEnroll, 
  showActions = true,
  className = '',
  redirectToPortfolio = false,
  onShowInterest,
  hasShownInterest
}: CourseCardProps) {
  const canPurchase = canPurchaseCourse(course.course_status || 'live')
  const buttonText = getPurchaseButtonText(course.course_status || 'live')

  const getPriceDisplay = () => {
    const basePriceValue = course.price_without_certificate ?? course.price_with_certificate ?? course.price ?? 0
    if (basePriceValue <= 0) return 'Free'

    const basePrice = `$${basePriceValue.toFixed(2)}`

    if (course.min_price_after_discount != null && course.min_price_after_discount < basePriceValue) {
      return (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground line-through">{basePrice}</span>
          <span className="font-semibold text-green-600">
            ${course.min_price_after_discount.toFixed(2)}
          </span>
        </div>
      )
    }

    return basePrice
  }

  const isShowInterestCourse = course.category === 5 || course.category === 7
  const courseHasShownInterest = isShowInterestCourse && hasShownInterest?.(course.id)

  const descriptionContent = course.description || 'No description available'
  const isHtmlDescription = typeof descriptionContent === 'string' && /<[a-z][\s\S]*>/i.test(descriptionContent)

  return (
    <Card className={`h-full flex flex-col ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg line-clamp-2">{course.name}</CardTitle>
            <CardDescription className="mt-1 overflow-hidden">
              {isHtmlDescription ? (
                <div
                  className="course-desc text-sm line-clamp-2 [&_strong]:font-semibold [&_em]:italic [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_p]:m-0 [&_p]:leading-snug"
                  dangerouslySetInnerHTML={{ __html: descriptionContent }}
                />
              ) : (
                <span className="line-clamp-2 block">{descriptionContent}</span>
              )}
            </CardDescription>
          </div>
          <CourseStatusBadge 
            status={course.course_status || 'live'} 
            showIcon={true}
            className="shrink-0"
          />
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-4">
        {/* Course Image */}
        {course.image_url && (
          <div className="aspect-video rounded-lg overflow-hidden bg-gray-100">
            <img
              src={course.image_url}
              alt={course.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
          </div>
        )}

        {/* Duration */}
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span>{course.duration || 'Self-Paced'}</span>
        </div>

        {/* Price - hide for Show Interest courses (category 5 and 7) */}
        {!isShowInterestCourse && (
          <div className="text-lg font-semibold">
            {getPriceDisplay()}
          </div>
        )}

        {/* Tags */}
        {course.tags && course.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {course.tags.slice(0, 3).map((tag, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {course.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{course.tags.length - 3} more
              </Badge>
            )}
          </div>
        )}

        {/* Course Level */}
        {course.level && (
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{course.level}</span>
          </div>
        )}
      </CardContent>

      {showActions && (
        <CardFooter className="pt-4">
          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewDetails?.(course)}
              className="flex-1"
            >
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </Button>
            {isShowInterestCourse && onShowInterest ? (
              <Button
                size="sm"
                variant={courseHasShownInterest ? "outline" : "default"}
                disabled={!!courseHasShownInterest}
                className="flex-1"
                onClick={() => !courseHasShownInterest && onShowInterest(course)}
              >
                <Heart className="h-4 w-4 mr-2" />
                {courseHasShownInterest ? "Interest Shown" : "Show Interest"}
              </Button>
            ) : canPurchase ? (
              redirectToPortfolio ? (
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => onAddToCart?.(course)}
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  {buttonText}
                </Button>
              ) : (
              <PurchaseDialog course={course}>
                <Button
                  size="sm"
                  className="flex-1"
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  {buttonText}
                </Button>
              </PurchaseDialog>
              )
            ) : (
              <Button
                size="sm"
                disabled={true}
                className="flex-1"
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                {buttonText}
              </Button>
            )}
          </div>
        </CardFooter>
      )}
    </Card>
  )
}

// Course Grid Component
interface CourseGridProps {
  courses: Course[]
  onViewDetails?: (course: Course) => void
  onAddToCart?: (course: Course) => void
  onEnroll?: (course: Course) => void
  showActions?: boolean
  className?: string
  redirectToPortfolio?: boolean
  onShowInterest?: (course: Course) => void
  hasShownInterest?: (courseId: number) => boolean
}

export function CourseGrid({ 
  courses, 
  onViewDetails, 
  onAddToCart, 
  onEnroll, 
  showActions = true,
  className = '',
  redirectToPortfolio = false,
  onShowInterest,
  hasShownInterest
}: CourseGridProps) {
  if (courses.length === 0) {
    return (
      <div className="text-center py-12">
        <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-muted-foreground">No courses found</h3>
        <p className="text-sm text-muted-foreground mt-2">
          Try adjusting your search or filters
        </p>
      </div>
    )
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
      {courses.map((course) => (
        <CourseCard
          key={course.id}
          course={course}
          onViewDetails={onViewDetails}
          onAddToCart={onAddToCart}
          onEnroll={onEnroll}
          showActions={showActions}
          redirectToPortfolio={redirectToPortfolio}
          onShowInterest={onShowInterest}
          hasShownInterest={hasShownInterest}
        />
      ))}
    </div>
  )
}
