"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Search, TrendingUp, Users, BookOpen, CheckCircle, AlertTriangle, Filter, Download, Loader2, RefreshCw, Clock } from "lucide-react"
import { useAdminProgress } from "@/lib/hooks/useAdminProgress"
import { useState, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

export default function ProgressTrackerPage() {
  const router = useRouter()
  const { 
    students: studentProgress, 
    loading, 
    error, 
    lastUpdated, 
    refresh, 
    autoRefresh, 
    setAutoRefresh 
  } = useAdminProgress(30000) // Refresh every 30 seconds
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCourse, setSelectedCourse] = useState("all")
  const [isExporting, setIsExporting] = useState(false)

  // Calculate course stats from real-time data
  const courseStats = useMemo(() => {
    if (!studentProgress || studentProgress.length === 0) return []

    // Group students by course
    const courseMap = new Map<string, {
      course: string;
      totalStudents: number;
      totalProgress: number;
      totalTimeSpent: number;
      completedCount: number;
    }>()

    studentProgress.forEach(student => {
      student.enrollments?.forEach(enrollment => {
        const courseName = enrollment.courseName
        if (!courseMap.has(courseName)) {
          courseMap.set(courseName, {
            course: courseName,
            totalStudents: 0,
            totalProgress: 0,
            totalTimeSpent: 0,
            completedCount: 0
          })
        }

        const stats = courseMap.get(courseName)!
        stats.totalStudents++
        stats.totalProgress += enrollment.progress
        stats.totalTimeSpent += student.timeSpent
        if (enrollment.status === 'completed' || enrollment.progress >= 100) {
          stats.completedCount++
        }
      })
    })

    return Array.from(courseMap.values()).map(stats => ({
      course: stats.course,
      totalStudents: stats.totalStudents,
      averageProgress: stats.totalStudents > 0 ? Math.round(stats.totalProgress / stats.totalStudents) : 0,
      completionRate: stats.totalStudents > 0 ? Math.round((stats.completedCount / stats.totalStudents) * 100) : 0,
      averageTimeSpent: stats.totalStudents > 0 ? Math.round(stats.totalTimeSpent / stats.totalStudents) : 0,
    }))
  }, [studentProgress])

  // Filter students based on search and course selection
  const filteredStudents = useMemo(() => {
    return studentProgress.filter(student => {
      const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          student.email.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCourse = selectedCourse === "all" || student.course.toLowerCase().includes(selectedCourse.toLowerCase())
      return matchesSearch && matchesCourse
    })
  }, [studentProgress, searchTerm, selectedCourse])

  // Calculate statistics
  const totalStudents = filteredStudents.length
  const averageProgress = totalStudents > 0 ? Math.round(
    filteredStudents.reduce((acc, student) => acc + student.overallProgress, 0) / totalStudents,
  ) : 0
  const completedStudents = filteredStudents.filter(s => s.status === "Completed").length
  const behindSchedule = filteredStudents.filter(s => s.status === "Behind Schedule").length

  // Get unique courses for filter
  const availableCourses = useMemo(() => {
    const courses = [...new Set(studentProgress.map(s => s.course))]
    return courses.filter(course => course !== "No Course Enrolled")
  }, [studentProgress])

  // Export to CSV
  const handleExportReport = useCallback(() => {
    try {
      setIsExporting(true)
      
      // Prepare CSV data
      const headers = [
        'Student Name',
        'Email',
        'Course',
        'Overall Progress (%)',
        'Status',
        'Units Completed',
        'Total Units',
        'Time Spent (hours)',
        'Enrollment Date',
        'Last Activity'
      ]

      const csvRows = [
        headers.join(','),
        ...filteredStudents.map(student => [
          `"${student.name}"`,
          `"${student.email}"`,
          `"${student.course}"`,
          student.overallProgress,
          `"${student.status}"`,
          student.unitsCompleted,
          student.totalUnits,
          student.timeSpent,
          `"${new Date(student.enrollmentDate).toLocaleDateString()}"`,
          `"${new Date(student.lastActivity).toLocaleDateString()}"`
        ].join(','))
      ]

      const csvContent = csvRows.join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      
      link.setAttribute('href', url)
      link.setAttribute('download', `student-progress-report-${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      toast.success('Progress report exported successfully')
    } catch (error) {
      console.error('Error exporting report:', error)
      toast.error('Failed to export report. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }, [filteredStudents])

  // Navigate to Analytics
  const handleViewAnalytics = useCallback(() => {
    router.push('/admin/reports')
  }, [router])

  // Loading state
  if (loading && studentProgress.length === 0) {
    return (
              <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading real-time progress data...</span>
        </div>
    )
  }

  // Error state
  if (error && studentProgress.length === 0) {
    return (
              <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-600 mb-4">Error loading progress data: {error}</p>
            <Button onClick={refresh}>Retry</Button>
          </div>
        </div>
    )
  }

  // Helper functions
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "On Track":
        return (
          <Badge variant="default" className="bg-blue-500 text-white">
            On Track
          </Badge>
        )
      case "Completed":
        return (
          <Badge variant="default" className="bg-green-500 text-white">
            Completed
          </Badge>
        )
      case "Behind Schedule":
        return <Badge variant="destructive">Behind Schedule</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return "bg-green-500"
    if (progress >= 50) return "bg-blue-500"
    if (progress >= 25) return "bg-yellow-500"
    return "bg-gray-500"
  }

  return (
          <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-bold text-foreground">Progress Tracker</h2>
              {autoRefresh && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  Live
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-2">Monitor real-time student progress across all courses</p>
            {lastUpdated && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Last updated: {lastUpdated.toLocaleTimeString()}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center space-x-2">
              <Switch
                id="auto-refresh"
                checked={autoRefresh}
                onCheckedChange={setAutoRefresh}
              />
              <Label htmlFor="auto-refresh" className="text-sm">
                Auto-refresh
              </Label>
            </div>
            <Button 
              variant="outline" 
              onClick={refresh}
              disabled={loading}
              size="sm"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </>
              )}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleExportReport}
              disabled={isExporting || filteredStudents.length === 0}
            >
              {isExporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Export Report
                </>
              )}
            </Button>
            <Button 
              className="bg-primary hover:bg-primary/90"
              onClick={handleViewAnalytics}
            >
              <TrendingUp className="mr-2 h-4 w-4" />
              Analytics
            </Button>
          </div>
        </div>

        {/* Progress Statistics */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-foreground">{totalStudents}</div>
                  <p className="text-xs text-muted-foreground">Active Students</p>
                </div>
                <Users className="h-8 w-8 text-chart-1" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-foreground">{averageProgress}%</div>
                  <p className="text-xs text-muted-foreground">Average Progress</p>
                </div>
                <TrendingUp className="h-8 w-8 text-chart-3" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-foreground">{completedStudents}</div>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </div>
                <CheckCircle className="h-8 w-8 text-chart-3" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-foreground">{behindSchedule}</div>
                  <p className="text-xs text-muted-foreground">Behind Schedule</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-chart-2" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress Tracking */}
        <Tabs defaultValue="individual" className="space-y-6">
          <TabsList>
            <TabsTrigger value="individual">Individual Progress</TabsTrigger>
            <TabsTrigger value="course-overview">Course Overview</TabsTrigger>
          </TabsList>

          <TabsContent value="individual" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Student Progress Tracking</CardTitle>
                <CardDescription>Monitor individual student progress and performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input 
                      placeholder="Search students..." 
                      className="pl-10" 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by course" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Courses</SelectItem>
                      {availableCourses.map(course => (
                        <SelectItem key={course} value={course.toLowerCase()}>
                          {course}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline">
                    <Filter className="mr-2 h-4 w-4" />
                    More Filters
                  </Button>
                </div>

                <div className="space-y-4">
                  {filteredStudents.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No students found matching your criteria.</p>
                    </div>
                  ) : (
                    filteredStudents.map((student) => (
                      <Card key={student.id} className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center space-x-4">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={student.avatar || "/placeholder.svg?height=40&width=40"} alt={student.name} />
                              <AvatarFallback>
                                {student.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h3 className="font-semibold text-lg">{student.name}</h3>
                              <p className="text-sm text-muted-foreground">{student.email}</p>
                              <div className="flex items-center space-x-4 mt-1">
                                <Badge variant="outline">{student.course}</Badge>
                                {getStatusBadge(student.status)}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-foreground">{student.overallProgress}%</div>
                            <p className="text-sm text-muted-foreground">Overall Progress</p>
                          </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-3 mb-4">
                          <div className="text-center">
                            <div className="text-lg font-semibold">
                              {student.unitsCompleted}/{student.totalUnits}
                            </div>
                            <p className="text-xs text-muted-foreground">Units Completed</p>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-semibold">{student.timeSpent}h</div>
                            <p className="text-xs text-muted-foreground">Time Spent</p>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-semibold">
                              {new Date(student.lastActivity).toLocaleDateString()}
                            </div>
                            <p className="text-xs text-muted-foreground">Last Activity</p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Current: {student.currentUnit}</span>
                          </div>
                          <Progress value={student.overallProgress} className="h-2" />

                          <div className="grid gap-2 md:grid-cols-2">
                            {student.unitProgress.map((unit, index) => (
                              <div key={index} className="space-y-1">
                                <div className="flex items-center justify-between p-2 bg-muted rounded">
                                  <span className="text-sm">{unit.name}</span>
                                  <div className="flex items-center space-x-2">
                                    <div className="w-16 bg-background rounded-full h-1">
                                      <div
                                        className={`h-1 rounded-full ${getProgressColor(unit.progress)}`}
                                        style={{ width: `${unit.progress}%` }}
                                      />
                                    </div>
                                    <span className="text-xs text-muted-foreground w-8">{unit.progress}%</span>
                                  </div>
                                </div>
                                {(unit.grade || unit.trialSectionsCompleted !== undefined && unit.trialSectionsCompleted > 0 || (unit.quizAttempts && unit.quizAttempts.length > 0)) ? (
                                  <div className="pl-2 text-xs text-muted-foreground space-y-0.5">
                                    {unit.grade && (
                                      <div className="font-medium text-foreground">Grade: {unit.grade}</div>
                                    )}
                                    {unit.trialSectionsCompleted !== undefined && unit.trialSectionsCompleted > 0 && (
                                      <div>Trial: {unit.trialSectionsCompleted} section{unit.trialSectionsCompleted !== 1 ? "s" : ""} completed</div>
                                    )}
                                    {unit.quizAttempts && unit.quizAttempts.length > 0 && (
                                      <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                                        {unit.quizAttempts.slice(0, 5).map((q, i) => (
                                          <span key={i} title={new Date(q.attempted_at).toLocaleString()}>
                                            {q.quiz_identifier}: {q.score_percent}% {q.passed ? "✓" : "✗"}
                                          </span>
                                        ))}
                                        {unit.quizAttempts.length > 5 && (
                                          <span>+{unit.quizAttempts.length - 5} more</span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="course-overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Course Progress Overview</CardTitle>
                <CardDescription>Compare progress across different courses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {courseStats.map((course, index) => (
                    <div key={index} className="p-6 border rounded-lg">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <BookOpen className="h-6 w-6 text-chart-1" />
                          <div>
                            <h3 className="font-semibold text-lg">{course.course}</h3>
                            <p className="text-sm text-muted-foreground">{course.totalStudents} students enrolled</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-foreground">{course.averageProgress}%</div>
                          <p className="text-xs text-muted-foreground">Average Progress</p>
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-3 mb-4">
                        <div className="text-center p-3 bg-muted rounded">
                          <div className="text-lg font-semibold text-chart-3">{course.completionRate}%</div>
                          <p className="text-xs text-muted-foreground">Completion Rate</p>
                        </div>
                        <div className="text-center p-3 bg-muted rounded">
                          <div className="text-lg font-semibold text-chart-4">{course.averageTimeSpent}h</div>
                          <p className="text-xs text-muted-foreground">Avg. Time Spent</p>
                        </div>
                        <div className="text-center p-3 bg-muted rounded">
                          <div className="text-lg font-semibold text-chart-1">{course.totalStudents}</div>
                          <p className="text-xs text-muted-foreground">Total Students</p>
                        </div>
                      </div>

                      <Progress value={course.averageProgress} className="h-3" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  )
}
