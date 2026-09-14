"use client"

import { useState, useCallback, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { CourseStatusFilter } from '@/components/ui/course-status-filter'
import { CourseGrid } from '@/components/ui/course-card'
import { ShowInterestDialog } from '@/components/ui/show-interest-dialog'
import { useCourses } from '@/lib/hooks/useCourses'
import { useCourseInterest } from '@/lib/hooks/useCourseInterest'
import { useUser } from '@/lib/hooks/useUser'
import { Course } from '@/lib/api'
import { courseNameToSlug } from '@/lib/utils'
import { Search, Grid, List, Loader2, AlertCircle } from 'lucide-react'

export default function StudentCoursesPage() {
  const {
    courses,
    loading,
    error,
    fetchCourses,
    searchCourses,
    clearError
  } = useCourses()
  const { user } = useUser()
  const { hasShownInterest, checkInterest } = useCourseInterest()
  const [showInterestCourse, setShowInterestCourse] = useState<{ id: number; name: string } | null>(null)

  const [searchTerm, setSearchTerm] = useState("")
  const [courseStatusFilter, setCourseStatusFilter] = useState<string>("all")
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([])

  // Filter courses based on search term and status (exclude draft - not shown to students)
  useEffect(() => {
    let filtered = courses.filter(course => course.course_status !== 'draft')

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter((course) => {
        const q = searchTerm.toLowerCase()
        return (
          course.name.toLowerCase().includes(q) ||
          course.description?.toLowerCase().includes(q) ||
          (course.course_code ?? "").toLowerCase().includes(q)
        )
      })
    }

    // Filter by course status
    if (courseStatusFilter !== "all") {
      filtered = filtered.filter(course => course.course_status === courseStatusFilter)
    }

    setFilteredCourses(filtered)
  }, [courses, searchTerm, courseStatusFilter])

  // Check interest status for category 5 and 7 (VET) courses
  useEffect(() => {
    if (!user?.email || !courses.length) return
    courses.filter((c) => c.category === 5 || c.category === 7).forEach((c) => checkInterest(c.id, user.email))
  }, [user?.email, courses, checkInterest])

  const handleSearch = useCallback(() => {
    const params: any = {}
    if (searchTerm) params.name = searchTerm
    if (courseStatusFilter !== "all") params.course_status = courseStatusFilter
    
    if (Object.keys(params).length > 0) {
      searchCourses(params)
    } else {
      fetchCourses()
    }
  }, [searchTerm, courseStatusFilter, searchCourses, fetchCourses])

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const portfolioUrl = process.env.NEXT_PUBLIC_PORTFOLIO_URL || (process.env.NODE_ENV === 'production' ? 'https://edtec.online' : 'http://localhost:5173')

  const handleViewDetails = (course: Course) => {
    window.location.href = `${portfolioUrl}/course/${courseNameToSlug(course.name)}`
  }

  const handleAddToCart = (course: Course) => {
    window.location.href = `${portfolioUrl}/course/${courseNameToSlug(course.name)}`
  }

  const handleEnroll = (course: Course) => {
    handleAddToCart(course)
  }

  const clearFilters = () => {
    setSearchTerm('')
    setCourseStatusFilter('all')
    fetchCourses()
  }

  // Get course statistics (exclude draft - not shown to students)
  const visibleCourses = courses.filter(c => c.course_status !== 'draft')
  const courseStats = {
    total: visibleCourses.length,
    live: visibleCourses.filter(c => c.course_status === 'live').length,
    comingSoon: visibleCourses.filter(c => c.course_status === 'coming_soon').length,
    archived: visibleCourses.filter(c => c.course_status === 'archived').length
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-destructive mb-2">Error Loading Courses</h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={() => { clearError(); fetchCourses(); }}>
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-foreground">Course Catalog</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Discover and enroll in courses that match your learning goals
        </p>
      </div>

      {/* Course Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-foreground">{courseStats.total}</div>
            <p className="text-sm text-muted-foreground">Total Courses</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-success">{courseStats.live}</div>
            <p className="text-sm text-muted-foreground">Available Now</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{courseStats.comingSoon}</div>
            <p className="text-sm text-muted-foreground">Coming Soon</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-muted-foreground">{courseStats.archived}</div>
            <p className="text-sm text-muted-foreground">Archived</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Find Your Perfect Course</CardTitle>
          <CardDescription>
            Search and filter through our course catalog to find exactly what you're looking for
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:space-x-4 sm:space-y-0">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input 
                placeholder="Search by name, description, or unit code (e.g. ETHTL115)" 
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleSearchKeyPress}
              />
            </div>
            <div className="flex space-x-2">
              <CourseStatusFilter 
                value={courseStatusFilter as any}
                onValueChange={setCourseStatusFilter}
                hideDraft
              />
              <Button 
                variant="outline" 
                onClick={handleSearch}
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Search
              </Button>
              <Button 
                variant="outline" 
                onClick={clearFilters}
                disabled={loading}
              >
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {loading ? (
              "Loading courses..."
            ) : (
              `Showing ${filteredCourses.length} of ${visibleCourses.length} courses`
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {loading && courses.length === 0 ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading courses...</span>
          </div>
        ) : (
          <>
            <CourseGrid
              courses={filteredCourses}
              onViewDetails={handleViewDetails}
              onAddToCart={handleAddToCart}
              onEnroll={handleEnroll}
              showActions={true}
              className={viewMode === 'list' ? 'grid-cols-1' : ''}
              redirectToPortfolio={true}
              onShowInterest={(c) => setShowInterestCourse({ id: c.id, name: c.name })}
              hasShownInterest={(id) => hasShownInterest(id)}
            />
            {showInterestCourse && (
              <ShowInterestDialog
                open={!!showInterestCourse}
                onClose={() => setShowInterestCourse(null)}
                courseId={showInterestCourse.id}
                courseName={showInterestCourse.name}
                onSuccess={() => user?.email && checkInterest(showInterestCourse.id, user.email)}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}
