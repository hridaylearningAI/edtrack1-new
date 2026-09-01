"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { TrendingUp, Users, DollarSign, BookOpen, Download, Calendar, Award, Target, Activity, Loader2 } from "lucide-react"
import { useAnalytics } from "@/lib/hooks/useAnalytics"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area, ScatterChart, Scatter, ComposedChart, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts"
import { useState, useCallback } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

// Custom tooltip component with explicit background styling
const CustomTooltipContent = (props: any) => {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 text-sm">
      <div className="text-gray-900 dark:text-gray-100">
        {props.label && <div className="font-medium mb-1">{props.label}</div>}
        {props.payload && props.payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm">
              {entry.name}: {entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D']

export default function ReportsAnalyticsPage() {
  const { data, loading, error, refreshData } = useAnalytics()
  const [timeRange, setTimeRange] = useState("last-30-days")
  const [isCustomRangeDialogOpen, setIsCustomRangeDialogOpen] = useState(false)
  const [customStartDate, setCustomStartDate] = useState("")
  const [customEndDate, setCustomEndDate] = useState("")
  const [isExporting, setIsExporting] = useState(false)

  // Calculate keyMetrics - must be before early returns but can use useMemo
  const keyMetrics = data ? [
    {
      title: "Total Students",
      value: data.totalStudents.toLocaleString(),
      change: "+12%",
      trend: "up",
      icon: Users,
      color: "text-blue-600",
    },
    {
      title: "Total Revenue",
      value: `$${(data.totalRevenue / 1000).toFixed(0)}K`,
      change: `+${data.financialMetrics.monthlyGrowth}%`,
      trend: "up",
      icon: DollarSign,
      color: "text-green-600",
    },
    {
      title: "Course Completion",
      value: `${data.courseCompletionRate}%`,
      change: "+3%",
      trend: "up",
      icon: Award,
      color: "text-purple-600",
    },
    {
      title: "Active Courses",
      value: data.activeCourses.toString(),
      change: "+2",
      trend: "up",
      icon: BookOpen,
      color: "text-orange-600",
    },
  ] : []

  // Handle custom date range - must be before early returns
  const handleCustomRangeSubmit = useCallback(() => {
    if (!customStartDate || !customEndDate) {
      toast.error('Please select both start and end dates')
      return
    }

    if (new Date(customStartDate) > new Date(customEndDate)) {
      toast.error('Start date must be before end date')
      return
    }

    // Set timeRange to custom and store dates
    setTimeRange(`custom-${customStartDate}-${customEndDate}`)
    setIsCustomRangeDialogOpen(false)
    toast.success(`Date range set: ${new Date(customStartDate).toLocaleDateString()} - ${new Date(customEndDate).toLocaleDateString()}`)
  }, [customStartDate, customEndDate])

  // Export report to CSV - must be before early returns
  const handleExportReport = useCallback(() => {
    try {
      setIsExporting(true)

      if (!data) {
        toast.error('No data available to export')
        return
      }

      // Prepare CSV data with key metrics
      const headers = [
        'Metric',
        'Value',
        'Change',
        'Date Range'
      ]

      const csvRows = [
        headers.join(','),
        ...keyMetrics.map(metric => [
          `"${metric.title}"`,
          `"${metric.value}"`,
          `"${metric.change}"`,
          `"${timeRange}"`
        ].join(',')),
        '', // Empty row
        'Detailed Analytics',
        '',
        `"Total Students","${data.totalStudents}"`,
        `"Total Revenue","$${data.totalRevenue.toLocaleString()}"`,
        `"Course Completion Rate","${data.courseCompletionRate}%"`,
        `"Active Courses","${data.activeCourses}"`,
        `"Monthly Growth","${data.financialMetrics.monthlyGrowth}%"`
      ]

      const csvContent = csvRows.join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      
      link.setAttribute('href', url)
      link.setAttribute('download', `analytics-report-${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      toast.success('Analytics report exported successfully')
    } catch (error) {
      console.error('Error exporting report:', error)
      toast.error('Failed to export report. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }, [data, keyMetrics, timeRange])

  // Early returns after all hooks
  if (loading && !data) {
    return (
              <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading analytics data...</span>
        </div>
    )
  }

  if (error) {
    return (
              <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-600 mb-4">Error loading analytics data: {error}</p>
            <Button onClick={refreshData}>Retry</Button>
          </div>
        </div>
    )
  }

  return (
    <>
          <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-foreground">Reports & Analytics</h2>
            <p className="text-muted-foreground mt-2">Comprehensive insights and performance analytics</p>
          </div>
          <div className="flex space-x-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last-7-days">Last 7 days</SelectItem>
                <SelectItem value="last-30-days">Last 30 days</SelectItem>
                <SelectItem value="last-90-days">Last 90 days</SelectItem>
                <SelectItem value="last-year">Last year</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline"
              onClick={() => setIsCustomRangeDialogOpen(true)}
            >
              <Calendar className="mr-2 h-4 w-4" />
              Custom Range
            </Button>
            <Button 
              className="bg-primary hover:bg-primary/90" 
              onClick={handleExportReport}
              disabled={isExporting || !data}
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
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-4">
          {keyMetrics.map((metric, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-foreground">{metric.value}</div>
                    <p className="text-xs text-muted-foreground">{metric.title}</p>
                    <div className="flex items-center mt-1">
                      <TrendingUp className="h-3 w-3 text-chart-3 mr-1" />
                      <span className="text-xs text-chart-3">{metric.change}</span>
                    </div>
                  </div>
                  <metric.icon className={`h-8 w-8 ${metric.color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Analytics Dashboard */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="courses">Courses</TabsTrigger>
            <TabsTrigger value="financial">Financial</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Top Row - Key Performance Charts */}
            <div className="grid gap-6 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>Enrollment & Revenue Trends</CardTitle>
                  <CardDescription>Monthly enrollment and revenue patterns</CardDescription>
                </CardHeader>
                <CardContent>
                  {data ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data.enrollmentTrends}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ccc" className="dark:[&_line]:stroke-gray-700" />
                          <XAxis 
                            dataKey="month" 
                            tick={{ fontSize: 12, fill: '#000' }}
                            tickLine={{ stroke: '#666' }}
                            axisLine={{ stroke: '#666' }}
                            className="dark:[&>text]:fill-white dark:[&_line]:stroke-white"
                          />
                          <YAxis 
                            yAxisId="left"
                            tick={{ fontSize: 12, fill: '#000' }}
                            tickLine={{ stroke: '#666' }}
                            axisLine={{ stroke: '#666' }}
                            className="dark:[&>text]:fill-white dark:[&_line]:stroke-white"
                          />
                          <YAxis 
                            yAxisId="right" 
                            orientation="right"
                            tick={{ fontSize: 12, fill: '#000' }}
                            tickLine={{ stroke: '#666' }}
                            axisLine={{ stroke: '#666' }}
                            className="dark:[&>text]:fill-white dark:[&_line]:stroke-white"
                          />
                          <Tooltip content={<CustomTooltipContent />} />
                          <Area
                            yAxisId="left"
                            type="monotone"
                            dataKey="students"
                            stroke="#3b82f6"
                            fill="#3b82f6"
                            fillOpacity={0.4}
                          />
                          <Area
                            yAxisId="right"
                            type="monotone"
                            dataKey="revenue"
                            stroke="#10b981"
                            fill="#10b981"
                            fillOpacity={0.4}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center bg-muted rounded">
                      <p className="text-muted-foreground">No data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Course Performance Comparison</CardTitle>
                  <CardDescription>Enrollment vs completion rates by course</CardDescription>
                </CardHeader>
                <CardContent>
                  {data && data.coursePerformance.length > 0 ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.coursePerformance.slice(0, 5)}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ccc" className="dark:[&_line]:stroke-gray-700" />
                          <XAxis 
                            dataKey="courseName" 
                            tick={{ fontSize: 10, fill: '#000' }}
                            tickLine={{ stroke: '#666' }}
                            axisLine={{ stroke: '#666' }}
                            className="dark:[&>text]:fill-white dark:[&_line]:stroke-white"
                            angle={-45}
                            textAnchor="end"
                            height={80}
                          />
                          <YAxis 
                            tick={{ fontSize: 12, fill: '#000' }}
                            tickLine={{ stroke: '#666' }}
                            axisLine={{ stroke: '#666' }}
                            className="dark:[&>text]:fill-white dark:[&_line]:stroke-white"
                          />
                          <Tooltip content={<CustomTooltipContent />} />
                          <Legend 
                            wrapperStyle={{ color: '#000' }}
                            className="dark:[&>text]:text-white"
                          />
                          <Bar dataKey="enrolled" fill="#3b82f6" name="Enrolled" />
                          <Bar dataKey="completed" fill="#10b981" name="Completed" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center bg-muted rounded">
                      <p className="text-muted-foreground">No course data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Revenue Distribution</CardTitle>
                  <CardDescription>Revenue breakdown by course</CardDescription>
                </CardHeader>
                <CardContent>
                  {data && data.revenueBreakdown.length > 0 ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data.revenueBreakdown}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ source, percentage }) => `${source} (${percentage}%)`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="amount"
                          >
                            {data.revenueBreakdown.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltipContent />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center bg-muted rounded">
                      <p className="text-muted-foreground">No revenue data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Second Row - Advanced Analytics */}
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Student Progress Distribution</CardTitle>
                  <CardDescription>Distribution of student progress categories</CardDescription>
                </CardHeader>
                <CardContent>
                  {data ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'On Track', value: data.studentProgress.onTrack, color: '#10b981' },
                              { name: 'Behind Schedule', value: data.studentProgress.behindSchedule, color: '#ef4444' },
                              { name: 'Ahead of Schedule', value: data.studentProgress.aheadOfSchedule, color: '#3b82f6' }
                            ]}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${percent ? (percent * 100).toFixed(0) : 0}%`}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            <Cell key="cell-0" fill="#10b981" />
                            <Cell key="cell-1" fill="#ef4444" />
                            <Cell key="cell-2" fill="#3b82f6" />
                          </Pie>
                          <Tooltip 
                            content={<CustomTooltipContent />}
                            formatter={(value: number, name: string) => [`${value}%`, name]}
                          />
                          <Legend 
                            wrapperStyle={{ color: '#000' }}
                            className="dark:[&>text]:text-white"
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center bg-muted rounded">
                      <p className="text-muted-foreground">No progress data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Revenue vs Enrollment Correlation</CardTitle>
                  <CardDescription>Relationship between course enrollment and revenue</CardDescription>
                </CardHeader>
                <CardContent>
                  {data && data.coursePerformance.length > 0 ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart data={data.coursePerformance}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ccc" className="dark:[&_line]:stroke-gray-700" />
                          <XAxis 
                            dataKey="enrolled" 
                            name="Enrolled"
                            tick={{ fontSize: 12, fill: '#000' }}
                            tickLine={{ stroke: '#666' }}
                            axisLine={{ stroke: '#666' }}
                            className="dark:[&>text]:fill-white dark:[&_line]:stroke-white"
                          />
                          <YAxis 
                            dataKey="revenue" 
                            name="Revenue"
                            tick={{ fontSize: 12, fill: '#000' }}
                            tickLine={{ stroke: '#666' }}
                            axisLine={{ stroke: '#666' }}
                            className="dark:[&>text]:fill-white dark:[&_line]:stroke-white"
                          />
                          <Tooltip content={<CustomTooltipContent />} />
                          <Scatter dataKey="revenue" fill="#8884d8" />
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center bg-muted rounded">
                      <p className="text-muted-foreground">No correlation data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Third Row - Performance Metrics */}
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Course Completion Rates</CardTitle>
                  <CardDescription>Completion rates across all courses</CardDescription>
                </CardHeader>
                <CardContent>
                  {data && data.coursePerformance.length > 0 ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data.coursePerformance.slice(0, 6)}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ courseName, completionRate }) => `${courseName}: ${completionRate}%`}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="completionRate"
                          >
                            {data.coursePerformance.slice(0, 6).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            content={<CustomTooltipContent />}
                            formatter={(value: number) => [`${value}%`, 'Completion Rate']}
                          />
                          <Legend 
                            wrapperStyle={{ color: '#000' }}
                            className="dark:[&>text]:text-white"
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center bg-muted rounded">
                      <p className="text-muted-foreground">No completion data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Financial Performance Overview</CardTitle>
                  <CardDescription>Key financial metrics and trends</CardDescription>
                </CardHeader>
                <CardContent>
                  {data ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={data.enrollmentTrends}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ccc" className="dark:[&_line]:stroke-gray-700" />
                          <XAxis 
                            dataKey="month" 
                            tick={{ fontSize: 12, fill: '#000' }}
                            tickLine={{ stroke: '#666' }}
                            axisLine={{ stroke: '#666' }}
                            className="dark:[&>text]:fill-white dark:[&_line]:stroke-white"
                          />
                          <YAxis 
                            yAxisId="left"
                            tick={{ fontSize: 12, fill: '#000' }}
                            tickLine={{ stroke: '#666' }}
                            axisLine={{ stroke: '#666' }}
                            className="dark:[&>text]:fill-white dark:[&_line]:stroke-white"
                          />
                          <YAxis 
                            yAxisId="right" 
                            orientation="right"
                            tick={{ fontSize: 12, fill: '#000' }}
                            tickLine={{ stroke: '#666' }}
                            axisLine={{ stroke: '#666' }}
                            className="dark:[&>text]:fill-white dark:[&_line]:stroke-white"
                          />
                          <Tooltip content={<CustomTooltipContent />} />
                          <Legend 
                            wrapperStyle={{ color: '#000' }}
                            className="dark:[&>text]:text-white"
                          />
                          <Bar yAxisId="left" dataKey="students" fill="#3b82f6" name="Students" />
                          <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} name="Revenue" />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center bg-muted rounded">
                      <p className="text-muted-foreground">No financial data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="students" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Student Progress Distribution</CardTitle>
                  <CardDescription>Progress distribution across all students</CardDescription>
                </CardHeader>
                <CardContent>
                  {data ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'On Track', value: data.studentProgress.onTrack, color: '#10b981' },
                              { name: 'Behind Schedule', value: data.studentProgress.behindSchedule, color: '#ef4444' },
                              { name: 'Ahead of Schedule', value: data.studentProgress.aheadOfSchedule, color: '#3b82f6' }
                            ]}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percentage }) => `${name} (${percentage}%)`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {[
                              { name: 'On Track', value: data.studentProgress.onTrack, color: '#10b981' },
                              { name: 'Behind Schedule', value: data.studentProgress.behindSchedule, color: '#ef4444' },
                              { name: 'Ahead of Schedule', value: data.studentProgress.aheadOfSchedule, color: '#3b82f6' }
                            ].map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltipContent />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center bg-muted rounded">
                      <p className="text-muted-foreground">No student progress data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Student Progress Trends</CardTitle>
                  <CardDescription>Progress trends over time</CardDescription>
                </CardHeader>
                <CardContent>
                  {data ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data.enrollmentTrends}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ccc" className="dark:[&_line]:stroke-gray-700" />
                          <XAxis 
                            dataKey="month" 
                            tick={{ fontSize: 12, fill: '#000' }}
                            tickLine={{ stroke: '#666' }}
                            axisLine={{ stroke: '#666' }}
                            className="dark:[&>text]:fill-white dark:[&_line]:stroke-white"
                          />
                          <YAxis 
                            tick={{ fontSize: 12, fill: '#000' }}
                            tickLine={{ stroke: '#666' }}
                            axisLine={{ stroke: '#666' }}
                            className="dark:[&>text]:fill-white dark:[&_line]:stroke-white"
                          />
                          <Tooltip content={<CustomTooltipContent />} />
                          <Line 
                            type="monotone" 
                            dataKey="students" 
                            stroke="#3b82f6" 
                            strokeWidth={3}
                            dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                            activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center bg-muted rounded">
                      <p className="text-muted-foreground">No trend data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Detailed Student Progress Metrics</CardTitle>
                <CardDescription>Comprehensive student progress analysis</CardDescription>
              </CardHeader>
              <CardContent>
                {data ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">On Track</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-muted-foreground">{data.studentProgress.onTrack}%</span>
                        <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">{data.studentProgress.onTrack}%</Badge>
                      </div>
                    </div>
                    <Progress value={data.studentProgress.onTrack} className="h-2" />
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Behind Schedule</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-muted-foreground">{data.studentProgress.behindSchedule}%</span>
                        <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">{data.studentProgress.behindSchedule}%</Badge>
                      </div>
                    </div>
                    <Progress value={data.studentProgress.behindSchedule} className="h-2" />
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Ahead of Schedule</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-muted-foreground">{data.studentProgress.aheadOfSchedule}%</span>
                        <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">{data.studentProgress.aheadOfSchedule}%</Badge>
                      </div>
                    </div>
                    <Progress value={data.studentProgress.aheadOfSchedule} className="h-2" />
                  </div>
                ) : (
                  <div className="h-32 flex items-center justify-center bg-muted rounded">
                    <p className="text-muted-foreground">No student progress data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="courses" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Course Performance Radar</CardTitle>
                  <CardDescription>Multi-dimensional course performance analysis</CardDescription>
                </CardHeader>
                <CardContent>
                  {data && data.coursePerformance.length > 0 ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={data.coursePerformance.slice(0, 4).map(course => ({
                          course: course.courseName,
                          enrollment: course.enrolled,
                          completion: course.completed,
                          revenue: course.revenue / 1000, // Scale down for radar chart
                          completionRate: course.completionRate
                        }))}>
                          <PolarGrid stroke="hsl(var(--muted))" />
                          <PolarAngleAxis 
                            dataKey="course" 
                            tick={{ fontSize: 10, fill: 'hsl(var(--foreground))' }}
                          />
                          <PolarRadiusAxis 
                            tick={{ fontSize: 10, fill: 'hsl(var(--foreground))' }}
                            axisLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                          />
                          <Radar 
                            name="Enrollment" 
                            dataKey="enrollment" 
                            stroke="#3b82f6" 
                            fill="#3b82f6" 
                            fillOpacity={0.3} 
                          />
                          <Radar 
                            name="Completion" 
                            dataKey="completion" 
                            stroke="#10b981" 
                            fill="#10b981" 
                            fillOpacity={0.3} 
                          />
                          <Tooltip content={<CustomTooltipContent />} />
                          <Legend 
                            wrapperStyle={{ color: '#000' }}
                            className="dark:[&>text]:text-white"
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center bg-muted rounded">
                      <p className="text-muted-foreground">No course performance data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Course Revenue vs Completion</CardTitle>
                  <CardDescription>Revenue generation vs completion rates</CardDescription>
                </CardHeader>
                <CardContent>
                  {data && data.coursePerformance.length > 0 ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart data={data.coursePerformance}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ccc" className="dark:[&_line]:stroke-gray-700" />
                          <XAxis 
                            dataKey="completionRate" 
                            name="Completion Rate"
                            tick={{ fontSize: 12, fill: '#000' }}
                            tickLine={{ stroke: '#666' }}
                            axisLine={{ stroke: '#666' }}
                            className="dark:[&>text]:fill-white dark:[&_line]:stroke-white"
                          />
                          <YAxis 
                            dataKey="revenue" 
                            name="Revenue"
                            tick={{ fontSize: 12, fill: '#000' }}
                            tickLine={{ stroke: '#666' }}
                            axisLine={{ stroke: '#666' }}
                            className="dark:[&>text]:fill-white dark:[&_line]:stroke-white"
                          />
                          <Tooltip content={<CustomTooltipContent />} />
                          <Scatter dataKey="revenue" fill="#8b5cf6" />
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center bg-muted rounded">
                      <p className="text-muted-foreground">No course correlation data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Detailed Course Analytics</CardTitle>
                <CardDescription>Comprehensive course performance metrics</CardDescription>
              </CardHeader>
              <CardContent>
                {data && data.coursePerformance.length > 0 ? (
                  <div className="space-y-4">
                    {data.coursePerformance.slice(0, 5).map((course, index) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="font-semibold text-lg">{course.courseName}</h3>
                            <p className="text-sm text-muted-foreground">{course.enrolled} students enrolled</p>
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-bold text-foreground">${course.revenue.toLocaleString()}</div>
                            <p className="text-xs text-muted-foreground">Revenue</p>
                          </div>
                        </div>
                        <div className="grid gap-4 md:grid-cols-3">
                          <div className="text-center p-3 bg-muted rounded">
                            <div className="text-lg font-semibold text-blue-600">{course.enrolled}</div>
                            <p className="text-xs text-muted-foreground">Enrolled</p>
                          </div>
                          <div className="text-center p-3 bg-muted rounded">
                            <div className="text-lg font-semibold text-green-600">{course.completed}</div>
                            <p className="text-xs text-muted-foreground">Completed</p>
                          </div>
                          <div className="text-center p-3 bg-muted rounded">
                            <div className="text-lg font-semibold text-purple-600">{course.completionRate}%</div>
                            <p className="text-xs text-muted-foreground">Completion Rate</p>
                          </div>
                        </div>
                        <div className="mt-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-muted-foreground">Completion Progress</span>
                            <span className="text-sm text-muted-foreground">{course.completionRate}%</span>
                          </div>
                          <Progress value={course.completionRate} className="h-2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-32 flex items-center justify-center bg-muted rounded">
                    <p className="text-muted-foreground">No course performance data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="financial" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Trends</CardTitle>
                  <CardDescription>Monthly revenue growth</CardDescription>
                </CardHeader>
                <CardContent>
                  {data ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data.enrollmentTrends}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ccc" className="dark:[&_line]:stroke-gray-700" />
                          <XAxis 
                            dataKey="month" 
                            tick={{ fontSize: 12, fill: '#000' }}
                            tickLine={{ stroke: '#666' }}
                            axisLine={{ stroke: '#666' }}
                            className="dark:[&>text]:fill-white dark:[&_line]:stroke-white"
                          />
                          <YAxis 
                            tick={{ fontSize: 12, fill: '#000' }}
                            tickLine={{ stroke: '#666' }}
                            axisLine={{ stroke: '#666' }}
                            className="dark:[&>text]:fill-white dark:[&_line]:stroke-white"
                          />
                          <Tooltip content={<CustomTooltipContent />} />
                          <Area 
                            type="monotone" 
                            dataKey="revenue" 
                            stroke="#10b981" 
                            fill="#10b981" 
                            fillOpacity={0.4}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center bg-muted rounded">
                      <p className="text-muted-foreground">No revenue trend data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Revenue Distribution</CardTitle>
                  <CardDescription>Revenue breakdown by course</CardDescription>
                </CardHeader>
                <CardContent>
                  {data && data.revenueBreakdown.length > 0 ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.revenueBreakdown.slice(0, 5)}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ccc" className="dark:[&_line]:stroke-gray-700" />
                          <XAxis 
                            dataKey="source" 
                            tick={{ fontSize: 10, fill: '#000' }}
                            tickLine={{ stroke: '#666' }}
                            axisLine={{ stroke: '#666' }}
                            className="dark:[&>text]:fill-white dark:[&_line]:stroke-white"
                            angle={-45}
                            textAnchor="end"
                            height={80}
                          />
                          <YAxis 
                            tick={{ fontSize: 12, fill: '#000' }}
                            tickLine={{ stroke: '#666' }}
                            axisLine={{ stroke: '#666' }}
                            className="dark:[&>text]:fill-white dark:[&_line]:stroke-white"
                          />
                          <Tooltip content={<CustomTooltipContent />} />
                          <Bar dataKey="amount" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center bg-muted rounded">
                      <p className="text-muted-foreground">No revenue breakdown data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Financial Health</CardTitle>
                  <CardDescription>Key financial indicators</CardDescription>
                </CardHeader>
                <CardContent>
                  {data ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded">
                        <span className="font-medium text-green-800 dark:text-green-200">Total Revenue</span>
                        <span className="text-lg font-bold text-green-600">${data.financialMetrics.totalRevenue.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded">
                        <span className="font-medium text-red-800 dark:text-red-200">Outstanding Payments</span>
                        <span className="text-lg font-bold text-red-600">${data.financialMetrics.outstandingPayments.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                        <span className="font-medium text-blue-800 dark:text-blue-200">Average Course Price</span>
                        <span className="text-lg font-bold text-blue-600">${data.financialMetrics.averageCoursePrice.toFixed(0)}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded">
                        <span className="font-medium text-purple-800 dark:text-purple-200">Monthly Growth</span>
                        <span className="text-lg font-bold text-purple-600">+{data.financialMetrics.monthlyGrowth}%</span>
                      </div>
                    </div>
                  ) : (
                    <div className="h-32 flex items-center justify-center bg-muted rounded">
                      <p className="text-muted-foreground">No financial data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue vs Enrollment Correlation</CardTitle>
                  <CardDescription>Relationship between enrollment and revenue generation</CardDescription>
                </CardHeader>
                <CardContent>
                  {data ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart data={data.enrollmentTrends}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ccc" className="dark:[&_line]:stroke-gray-700" />
                          <XAxis 
                            dataKey="students" 
                            name="Students"
                            tick={{ fontSize: 12, fill: '#000' }}
                            tickLine={{ stroke: '#666' }}
                            axisLine={{ stroke: '#666' }}
                            className="dark:[&>text]:fill-white dark:[&_line]:stroke-white"
                          />
                          <YAxis 
                            dataKey="revenue" 
                            name="Revenue"
                            tick={{ fontSize: 12, fill: '#000' }}
                            tickLine={{ stroke: '#666' }}
                            axisLine={{ stroke: '#666' }}
                            className="dark:[&>text]:fill-white dark:[&_line]:stroke-white"
                          />
                          <Tooltip content={<CustomTooltipContent />} />
                          <Scatter dataKey="revenue" fill="#10b981" />
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center bg-muted rounded">
                      <p className="text-muted-foreground">No correlation data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Financial Performance Overview</CardTitle>
                  <CardDescription>Combined financial metrics and trends</CardDescription>
                </CardHeader>
                <CardContent>
                  {data ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={data.enrollmentTrends}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ccc" className="dark:[&_line]:stroke-gray-700" />
                          <XAxis 
                            dataKey="month" 
                            tick={{ fontSize: 12, fill: '#000' }}
                            tickLine={{ stroke: '#666' }}
                            axisLine={{ stroke: '#666' }}
                            className="dark:[&>text]:fill-white dark:[&_line]:stroke-white"
                          />
                          <YAxis 
                            yAxisId="left"
                            tick={{ fontSize: 12, fill: '#000' }}
                            tickLine={{ stroke: '#666' }}
                            axisLine={{ stroke: '#666' }}
                            className="dark:[&>text]:fill-white dark:[&_line]:stroke-white"
                          />
                          <YAxis 
                            yAxisId="right" 
                            orientation="right"
                            tick={{ fontSize: 12, fill: '#000' }}
                            tickLine={{ stroke: '#666' }}
                            axisLine={{ stroke: '#666' }}
                            className="dark:[&>text]:fill-white dark:[&_line]:stroke-white"
                          />
                          <Tooltip content={<CustomTooltipContent />} />
                          <Legend 
                            wrapperStyle={{ color: '#000' }}
                            className="dark:[&>text]:text-white"
                          />
                          <Bar yAxisId="left" dataKey="students" fill="#3b82f6" name="Students" />
                          <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} name="Revenue" />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center bg-muted rounded">
                      <p className="text-muted-foreground">No financial data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Custom Date Range Dialog */}
      <Dialog open={isCustomRangeDialogOpen} onOpenChange={setIsCustomRangeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Custom Date Range</DialogTitle>
            <DialogDescription>
              Choose a start and end date for your analytics report
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                max={customEndDate || new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                min={customStartDate}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setIsCustomRangeDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleCustomRangeSubmit}>
                Apply Range
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
