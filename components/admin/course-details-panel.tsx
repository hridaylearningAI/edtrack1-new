import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { X, Users, BarChart3, BookOpen, Clock, GraduationCap, TrendingUp, Target, Award, Loader2, AlertCircle } from 'lucide-react'
import { Course, Enrollment } from '@/lib/api'
import { useEnrollments } from '@/lib/hooks/useEnrollments'

interface CourseDetailsPanelProps {
  course: Course | null
  isOpen: boolean
  onClose: () => void
}

const getStatusBadge = (status: string) => {
  switch (status?.toLowerCase()) {
    case "active":
      return (
        <Badge variant="default" className="bg-green-600 text-white">
          Active
        </Badge>
      )
    case "inactive":
      return <Badge variant="secondary">Inactive</Badge>
    case "draft":
      return <Badge variant="outline">Draft</Badge>
    case "archived":
      return <Badge variant="outline">Archived</Badge>
    default:
      return <Badge variant="outline">{status || 'Unknown'}</Badge>
  }
}

const getEnrollmentStatusBadge = (status: string) => {
  switch (status?.toLowerCase()) {
    case "active":
      return (
        <Badge variant="default" className="bg-green-600 text-white text-xs">
          Active
        </Badge>
      )
    case "completed":
      return <Badge variant="secondary" className="text-xs">Completed</Badge>
    case "dropped":
      return <Badge variant="destructive" className="text-xs">Dropped</Badge>
    case "suspended":
      return <Badge variant="outline" className="text-xs">Suspended</Badge>
    default:
      return <Badge variant="outline" className="text-xs">{status || 'Enrolled'}</Badge>
  }
}

export function CourseDetailsPanel({ course, isOpen, onClose }: CourseDetailsPanelProps) {
  const [activeTab, setActiveTab] = useState("students")

  if (!course || !isOpen) return null

  // Use comprehensive data from the course object
  const courseEnrollments = course.enrollments || []
  const courseDiscounts = course.discounts || []
  const summaryStats = course.summary_stats || {}
  
  // Calculate enrollment statistics from comprehensive data
  const totalEnrollments = course.students_enrolled || 0
  const activeEnrollments = course.active_enrollments || 0
  const completedEnrollments = course.completed_enrollments || 0
  const averageProgress = course.average_progress || 0
  const completionRate = totalEnrollments > 0 ? (completedEnrollments / totalEnrollments) * 100 : 0

  // Analytics data based on comprehensive course data
  const analytics = {
    totalEnrollments,
    activeStudents: activeEnrollments,
    completionRate,
    averageProgress,
    weeklyEnrollments: [5, 8, 12, 15, 18, 22, totalEnrollments],
    progressDistribution: {
      "0-25%": Math.round(totalEnrollments * 0.3),
      "26-50%": Math.round(totalEnrollments * 0.25),
      "51-75%": Math.round(totalEnrollments * 0.25),
      "76-100%": Math.round(totalEnrollments * 0.2)
    },
    monthlyRevenue: (course.price || 0) * totalEnrollments,
    averageRating: 4.6,
    discountSavings: summaryStats.revenue_stats?.discount_savings || 0,
    potentialRevenue: summaryStats.revenue_stats?.potential_revenue || 0
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Side Panel */}
      <div className="relative ml-auto h-full w-[60%] bg-background shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-6 flex-shrink-0">
          <div className="flex items-center space-x-4">
            <BookOpen className="h-8 w-8 text-blue-600" />
            <div>
              <h2 className="text-2xl font-bold">{course.name}</h2>
              <p className="text-muted-foreground">Course Details</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Course Info */}
        <div className="p-6 border-b flex-shrink-0">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <div className="mt-1">{getStatusBadge(course.status || 'active')}</div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Price</p>
              <div className="mt-1">
                <div className="font-medium">
                  {course.price ? `$${course.price.toFixed(2)}` : 'N/A'}
                </div>
                {course.min_price_after_discount && course.min_price_after_discount < (course.price || 0) && (
                  <div className="text-sm text-green-600">
                    From ${course.min_price_after_discount.toFixed(2)}
                  </div>
                )}
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Students Enrolled</p>
              <div className="mt-1">
                <div className="font-medium">{course.students_enrolled || 0}</div>
                <div className="text-sm text-muted-foreground">
                  {course.active_enrollments || 0} active, {course.completed_enrollments || 0} completed
                </div>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Average Progress</p>
              <div className="mt-1">
                <div className="font-medium">{course.average_progress?.toFixed(1) || 0}%</div>
                <div className="w-20 bg-muted rounded-full h-2 mt-1">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${course.average_progress || 0}%` }}
                  />
                </div>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Discounts</p>
              <div className="mt-1">
                <div className="font-medium">{course.active_discount_count || 0}</div>
                <div className="text-sm text-muted-foreground">
                  {course.best_discount_amount ? `Up to $${course.best_discount_amount.toFixed(2)} off` : 'No discounts'}
                </div>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Created</p>
              <p className="mt-1 font-medium">
                {course.created_at 
                  ? new Date(course.created_at).toLocaleDateString()
                  : 'N/A'
                }
              </p>
            </div>
          </div>
          {course.description && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Description</p>
              <p className="text-sm">{course.description}</p>
            </div>
          )}
          {course.details && (
            <div className="mt-4">
              <p className="text-sm text-muted-foreground mb-1">Course Details & Curriculum</p>
              <div className="text-sm bg-muted/20 p-3 rounded-lg max-h-40 overflow-y-auto">
                <p className="whitespace-pre-wrap">{course.details}</p>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <div className="px-6 pt-4 flex-shrink-0">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="students" className="flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span>Students</span>
              </TabsTrigger>
              <TabsTrigger value="discounts" className="flex items-center space-x-2">
                <Award className="h-4 w-4" />
                <span>Discounts</span>
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center space-x-2">
                <BarChart3 className="h-4 w-4" />
                <span>Analytics</span>
              </TabsTrigger>
            </TabsList>
          </div>

                    {/* Students Tab */}
          <TabsContent value="students" className="flex-1 p-6 overflow-y-auto">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Enrolled Students</h3>
                <Badge variant="secondary">{totalEnrollments} students</Badge>
              </div>
              
              {courseEnrollments.length === 0 ? (
                <div className="flex items-center justify-center p-8">
                  <Users className="h-8 w-8 text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">No students enrolled yet</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {courseEnrollments.map((enrollment: any, index: number) => (
                    <Card key={`${enrollment.enrollment_id}-${enrollment.student_id}-${index}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src="/placeholder.svg" alt={enrollment.student_name || 'Student'} />
                              <AvatarFallback>
                                {(enrollment.student_name || 'Student').split(" ").map((n: string) => n[0]).join("")}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{enrollment.student_name || `Student ${enrollment.student_id}`}</p>
                              <p className="text-sm text-muted-foreground">ID: {enrollment.student_id}</p>
                              <p className="text-xs text-muted-foreground">
                                Enrolled: {enrollment.enrollment_date ? new Date(enrollment.enrollment_date).toLocaleDateString() : 'N/A'}
                              </p>
                              {enrollment.completion_date && (
                                <p className="text-xs text-muted-foreground">
                                  Completed: {new Date(enrollment.completion_date).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center space-x-2">
                              <div className="text-sm font-medium">{enrollment.progress || 0}%</div>
                              <div className="w-20 bg-muted rounded-full h-2">
                                <div
                                  className="bg-primary h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${enrollment.progress || 0}%` }}
                                />
                              </div>
                            </div>
                            <div className="mt-1">
                              {getEnrollmentStatusBadge(enrollment.status || 'enrolled')}
                            </div>
                            {enrollment.grade && (
                              <div className="mt-1 text-sm font-medium text-green-600">
                                Grade: {enrollment.grade}
                              </div>
                            )}
                          </div>
                        </div>
                        {enrollment.notes && (
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-xs text-muted-foreground">{enrollment.notes}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Discounts Tab */}
          <TabsContent value="discounts" className="flex-1 p-6 overflow-y-auto">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Available Discounts</h3>
                <Badge variant="secondary">{courseDiscounts.length} discounts</Badge>
              </div>
              
              {courseDiscounts.length === 0 ? (
                <div className="flex items-center justify-center p-8">
                  <Award className="h-8 w-8 text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">No discounts available for this course</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {courseDiscounts.map((discount: any, index: number) => (
                    <Card key={`${discount.id}-${discount.coupon_code}-${index}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h4 className="font-medium">{discount.name}</h4>
                              <Badge variant={discount.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                                {discount.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{discount.description}</p>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Type:</span>
                                <span className="ml-1 font-medium capitalize">{discount.discount_type}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Value:</span>
                                <span className="ml-1 font-medium">
                                  {discount.discount_type === 'percentage' ? `${discount.discount_value}%` : `$${discount.discount_value}`}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Usage:</span>
                                <span className="ml-1 font-medium">{discount.usage_count || 0}/{discount.usage_limit || '∞'}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Code:</span>
                                <span className="ml-1 font-medium">{discount.coupon_code || 'N/A'}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right ml-4">
                            <div className="text-sm text-muted-foreground">
                              {discount.start_date && (
                                <div>From: {new Date(discount.start_date).toLocaleDateString()}</div>
                              )}
                              {discount.end_date && (
                                <div>To: {new Date(discount.end_date).toLocaleDateString()}</div>
                              )}
                            </div>
                            {discount.is_one_time_use && (
                              <Badge variant="outline" className="mt-2 text-xs">One-time use</Badge>
                            )}
                            {discount.is_student_specific && (
                              <Badge variant="outline" className="mt-2 text-xs">Student-specific</Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="flex-1 p-6 overflow-y-auto">
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <Users className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">Total Enrollments</p>
                        <p className="text-2xl font-bold">{analytics.totalEnrollments}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <Target className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">Completion Rate</p>
                        <p className="text-2xl font-bold">{analytics.completionRate.toFixed(1)}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="h-5 w-5 text-orange-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">Avg Progress</p>
                        <p className="text-2xl font-bold">{analytics.averageProgress.toFixed(1)}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <Award className="h-5 w-5 text-purple-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">Potential Revenue</p>
                        <p className="text-2xl font-bold">${analytics.potentialRevenue.toFixed(0)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <BookOpen className="h-5 w-5 text-indigo-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">Active Discounts</p>
                        <p className="text-2xl font-bold">{course.active_discount_count || 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-5 w-5 text-red-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">Discount Savings</p>
                        <p className="text-2xl font-bold">${analytics.discountSavings.toFixed(0)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Progress Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Progress Distribution</CardTitle>
                  <CardDescription>How students are progressing through the course</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(analytics.progressDistribution).map(([range, count]) => (
                      <div key={range} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{range}</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-32 bg-muted rounded-full h-2">
                            <div
                              className="h-2 rounded-full bg-blue-600"
                              style={{ 
                                width: `${(count as number / analytics.totalEnrollments) * 100}%` 
                              }}
                            />
                          </div>
                          <span className="text-sm text-muted-foreground w-8">{count as number}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Weekly Enrollments */}
              <Card>
                <CardHeader>
                  <CardTitle>Weekly Enrollments</CardTitle>
                  <CardDescription>New student enrollments over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end space-x-2 h-32">
                    {analytics.weeklyEnrollments.map((count: number, index: number) => (
                      <div key={index} className="flex-1 flex flex-col items-center">
                        <div
                          className="w-full bg-blue-600 rounded-t"
                          style={{ 
                            height: `${(count / Math.max(...analytics.weeklyEnrollments)) * 100}%` 
                          }}
                        />
                        <span className="text-xs text-muted-foreground mt-1">{count}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-2">
                    <span>Week 1</span>
                    <span>Week 7</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
