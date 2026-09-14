"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, Plus, MoreHorizontal, BookOpen, Clock, Users, Edit, Trash2, AlertCircle, Loader2, Eye, Sparkles } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { useCourses } from "@/lib/hooks/useCourses"
import { CourseDialog } from "@/components/admin/course-dialog"
import { CourseDetailsPanel } from "@/components/admin/course-details-panel"
import { CourseStatusBadge } from "@/components/ui/course-status-badge"
import { CourseStatusFilter } from "@/components/ui/course-status-filter"
import { Course, CourseCreate, CourseUpdate } from "@/lib/api"
import { useState, useCallback, useEffect } from "react"
import { toast } from "sonner"

const getStatusBadge = (status: string) => {
  switch (status?.toLowerCase()) {
    case "active":
      return (
        <Badge variant="default" className="border-success-line bg-success-soft text-success">
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

export default function CoursesPage() {
  const {
    courses,
    loading,
    error,
    fetchCourses,
    createCourse,
    updateCourse,
    deleteCourse,
    searchCourses,
    clearError,
  } = useCourses()

  const [searchTerm, setSearchTerm] = useState("")

  // Opened from the command palette: ?q= prefills the search box.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('q')
    if (q) {
      setSearchTerm(q)
      searchCourses({ name: q })
    }
  }, [])
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [courseStatusFilter, setCourseStatusFilter] = useState<string>("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [courseDetailsPanelOpen, setCourseDetailsPanelOpen] = useState(false)
  const [selectedCourseForDetails, setSelectedCourseForDetails] = useState<Course | null>(null)

  const handleSearch = useCallback(() => {
    const params: any = {}
    if (searchTerm) params.name = searchTerm
    if (statusFilter !== "all") params.status = statusFilter
    if (courseStatusFilter !== "all") params.course_status = courseStatusFilter
    if (categoryFilter !== "all") params.category = parseInt(categoryFilter)
    
    if (Object.keys(params).length > 0) {
      searchCourses(params)
    } else {
      fetchCourses()
    }
  }, [searchTerm, statusFilter, courseStatusFilter, categoryFilter, searchCourses, fetchCourses])

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const handleCourseCreated = useCallback(async (data: CourseCreate | CourseUpdate) => {
    try {
      if ('name' in data && data.name) {
        await createCourse(data as CourseCreate)
        // Clear any active filters to show the new course
        setSearchTerm('')
        setStatusFilter('all')
        setCourseStatusFilter('all')
        setCategoryFilter('all')
      }
    } catch (error) {
      console.error('Failed to create course:', error)
    }
  }, [createCourse])

  const handleCourseUpdated = useCallback(async (data: CourseUpdate) => {
    if (!selectedCourse) return
    
    try {
      await updateCourse(selectedCourse.id, data)
      setSelectedCourse(null)
      setEditDialogOpen(false)
    } catch (error) {
      console.error('Failed to update course:', error)
    }
  }, [selectedCourse, updateCourse])

  const handleCourseDeleted = useCallback(async (courseId: number) => {
    if (confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
      try {
        await deleteCourse(courseId)
      } catch (error) {
        console.error('Failed to delete course:', error)
      }
    }
  }, [deleteCourse])

  const handleViewCourseDetails = useCallback((course: Course) => {
    setSelectedCourseForDetails(course)
    setCourseDetailsPanelOpen(true)
  }, [])

  const handleCloseCourseDetails = useCallback(() => {
    setCourseDetailsPanelOpen(false)
    setSelectedCourseForDetails(null)
  }, [])

  const handleTrialToggle = useCallback(async (course: Course, enabled: boolean) => {
    try {
      await updateCourse(course.id, {
        trial_enabled: enabled,
        trial_duration_days: enabled ? (course.trial_duration_days || 7) : undefined,
      })
      toast.success(`Trial ${enabled ? 'enabled' : 'disabled'} for ${course.name}`)
    } catch (error) {
      console.error('Failed to update trial setting:', error)
      toast.error('Failed to update trial setting')
    }
  }, [updateCourse])

  const handleTrialDurationChange = useCallback(async (course: Course, days: number) => {
    if (days < 1 || days > 365) {
      toast.error('Trial duration must be between 1 and 365 days')
      return
    }
    
    try {
      await updateCourse(course.id, {
        trial_duration_days: days,
      })
      toast.success(`Trial duration updated to ${days} days`)
    } catch (error) {
      console.error('Failed to update trial duration:', error)
      toast.error('Failed to update trial duration')
    }
  }, [updateCourse])

  // Clear error when component unmounts or error changes
  if (error) {
    toast.error(error)
    clearError()
  }

  const activeCourses = courses.filter(c => c.status?.toLowerCase() === 'active').length
  const totalCourses = courses.length

  return (
          <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-medium tracking-tight text-foreground">Courses</h2>
            <p className="text-muted-foreground mt-2">Manage courses and curriculum structure</p>
          </div>
          <CourseDialog onSubmit={handleCourseCreated} />
        </div>

        {/* Course Statistics */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-medium tracking-tight text-foreground">{totalCourses}</div>
                  <p className="text-xs text-muted-foreground">Total Courses</p>
                </div>
                <BookOpen className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-medium tracking-tight text-foreground">{activeCourses}</div>
                  <p className="text-xs text-muted-foreground">Active Courses</p>
                </div>
                <Users className="h-8 w-8 text-success" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-medium tracking-tight text-foreground">
                    {courses.reduce((total, course) => total + (course.students_enrolled || 0), 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">Total Enrollments</p>
                </div>
                <Users className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-medium tracking-tight text-foreground">
                    {courses.reduce((total, course) => total + (course.active_discount_count || 0), 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">Active Discounts</p>
                </div>
                <Clock className="h-8 w-8 text-warning" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Course Directory</CardTitle>
            <CardDescription>Search and filter through all courses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:space-x-4 sm:space-y-0 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input 
                  placeholder="Search courses by name..." 
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={handleSearchKeyPress}
                />
              </div>
              <div className="flex space-x-2 sm:space-x-4">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="1">Professional Development Programs</SelectItem>
                    <SelectItem value="2">Skill Development Program</SelectItem>
                    <SelectItem value="3">Trade Qualifications (VET)</SelectItem>
                    <SelectItem value="4">Higher Education (HE)</SelectItem>
                    <SelectItem value="5">Test Preparation</SelectItem>
                  </SelectContent>
                </Select>
                <CourseStatusFilter 
                  value={courseStatusFilter as any}
                  onValueChange={setCourseStatusFilter}
                />
                <Button 
                  variant="outline" 
                  className="flex-1 sm:flex-none bg-transparent"
                  onClick={handleSearch}
                  disabled={loading}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  Search
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1 sm:flex-none bg-transparent"
                  onClick={() => {
                    setSearchTerm('')
                    setStatusFilter('all')
                    setCourseStatusFilter('all')
                    setCategoryFilter('all')
                    fetchCourses()
                  }}
                  disabled={loading}
                >
                  Clear
                </Button>
              </div>
            </div>

            {/* Courses Table */}
            {loading && courses.length === 0 ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Loading courses...</span>
              </div>
            ) : courses.length === 0 ? (
              <div className="flex items-center justify-center p-8">
                <AlertCircle className="h-8 w-8 text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">No courses found</span>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Course Name</TableHead>
                    <TableHead>Course Code</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Students</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Discounts</TableHead>
                    <TableHead>Trial</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Availability</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {courses.map((course) => (
                    <TableRow key={course.id}>
                      <TableCell className="font-medium">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="font-semibold">{course.name}</div>
                            {/* Certificate pricing badges */}
                            {(() => {
                              const hasPriceWithoutCert = course.price_without_certificate !== undefined && course.price_without_certificate !== null;
                              const hasPriceWithCert = course.price_with_certificate !== undefined && course.price_with_certificate !== null;
                              
                              // Only show badge if one price exists but not the other
                              if (hasPriceWithoutCert && !hasPriceWithCert) {
                                return (
                                  <Badge variant="outline" className="text-xs bg-primary-soft text-primary border-primary-line">
                                    Without Certificate Only
                                  </Badge>
                                );
                              }
                              if (hasPriceWithCert && !hasPriceWithoutCert) {
                                return (
                                  <Badge variant="outline" className="text-xs bg-primary-soft text-primary border-primary-line">
                                    With Certificate Only
                                  </Badge>
                                );
                              }
                              return null;
                            })()}
                          </div>
                          <div className="text-sm text-muted-foreground max-w-[200px] truncate">
                            {course.description || 'No description'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {course.course_code ? (
                          <Badge variant="secondary" className="font-mono text-xs">
                            {course.course_code}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <Badge variant="outline" className="text-xs">
                            {course.category_name || `Category ${course.category || 'N/A'}`}
                          </Badge>
                          {course.category_code && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {course.category_code}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          {course.price_without_certificate || course.price ? (
                            <>
                              <div className="font-medium">
                                ${(course.price_without_certificate || course.price || 0).toFixed(2)}
                                {course.price_with_certificate && course.price_with_certificate !== course.price_without_certificate && (
                                  <span className="text-xs text-muted-foreground ml-1">
                                    / ${course.price_with_certificate.toFixed(2)} (cert)
                                  </span>
                                )}
                              </div>
                              {course.min_price_after_discount && course.min_price_after_discount < (course.price_without_certificate || course.price || 0) && (
                                <div className="text-sm text-success">
                                  From ${course.min_price_after_discount.toFixed(2)}
                                </div>
                              )}
                            </>
                          ) : (
                            'N/A'
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{course.students_enrolled || 0}</div>
                          <div className="text-sm text-muted-foreground">
                            {course.active_enrollments || 0} active
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <div className="w-16 bg-muted rounded-full h-2">
                            <div 
                              className="bg-primary h-2 rounded-full" 
                              style={{ width: `${course.average_progress || 0}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {course.average_progress?.toFixed(1) || 0}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{course.active_discount_count || 0}</div>
                          <div className="text-sm text-muted-foreground">
                            {course.best_discount_amount ? `Up to $${course.best_discount_amount.toFixed(2)} off` : 'No discounts'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-2 min-w-[120px]">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={course.trial_enabled || false}
                              onCheckedChange={(checked) => handleTrialToggle(course, checked)}
                              disabled={loading}
                            />
                            <span className="text-sm text-muted-foreground">
                              {course.trial_enabled ? (
                                <span className="flex items-center gap-1 text-success">
                                  <Sparkles className="h-3 w-3" />
                                  Enabled
                                </span>
                              ) : (
                                'Disabled'
                              )}
                            </span>
                          </div>
                          {course.trial_enabled && (
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min="1"
                                max="365"
                                value={course.trial_duration_days || 7}
                                onChange={(e) => {
                                  const days = parseInt(e.target.value)
                                  if (!isNaN(days) && days > 0) {
                                    handleTrialDurationChange(course, days)
                                  }
                                }}
                                className="h-7 w-16 text-xs"
                                disabled={loading}
                              />
                              <span className="text-xs text-muted-foreground">days</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(course.status || 'active')}</TableCell>
                      <TableCell>
                        <CourseStatusBadge 
                          status={course.course_status || 'live'} 
                          showIcon={true}
                        />
                      </TableCell>
                      <TableCell>
                        {course.created_at 
                          ? new Date(course.created_at).toLocaleDateString()
                          : 'N/A'
                        }
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleViewCourseDetails(course)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setSelectedCourse(course)
                              setEditDialogOpen(true)
                            }}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Course
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => handleCourseDeleted(course.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Course
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Edit Course Dialog */}
        {selectedCourse && (
          <CourseDialog
            course={selectedCourse}
            onSubmit={handleCourseUpdated}
            open={editDialogOpen}
            onOpenChange={(open) => {
              setEditDialogOpen(open)
              if (!open) {
                setSelectedCourse(null)
              }
            }}
          />
        )}

        {/* Course Details Panel */}
        <CourseDetailsPanel
          course={selectedCourseForDetails}
          isOpen={courseDetailsPanelOpen}
          onClose={handleCloseCourseDetails}
        />
      </div>
  )
}
