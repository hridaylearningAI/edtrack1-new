"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { TrendingUp, Users, DollarSign, BookOpen, Download, Calendar, Award, Target, Activity, Loader2 } from "lucide-react"
import { useAnalytics } from "@/lib/hooks/useAnalytics"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  ComposedChart,
  RadarChart,
  PolarGrid,
  PolarAngleAxis as RechartsPolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from "@/components/ui/chart"
import { useState, useCallback, type ComponentType } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

const PolarAngleAxis = RechartsPolarAngleAxis as unknown as ComponentType<{
  dataKey?: string
  tick?: Record<string, unknown>
}>

// Fixed order, checked with the dataviz palette validator; grey for anything past five.
const COLORS = ['#2054a0', '#2f8a64', '#c07a1a', '#6b5bb5', '#be353b', '#8c9bb0']

const chartConfig: ChartConfig = {
  students:         { label: "Students",           color: "#2054a0" },
  revenue:          { label: "Revenue",             color: "#2f8a64" },
  enrolled:         { label: "Enrolled",            color: "#2054a0" },
  completed:        { label: "Completed",           color: "#2f8a64" },
  amount:           { label: "Amount",              color: "#6b5bb5" },
  value:            { label: "Value",               color: "#6b5bb5" },
  enrollment:       { label: "Enrollment",          color: "#2054a0" },
  completion:       { label: "Completion",          color: "#2f8a64" },
  completionRate:   { label: "Completion Rate",     color: "#c07a1a" },
  onTrack:          { label: "On Track",            color: "#2f8a64" },
  behindSchedule:   { label: "Behind Schedule",     color: "#be353b" },
  aheadOfSchedule:  { label: "Ahead of Schedule",   color: "#2054a0" },
  source:           { label: "Source",              color: "#6b5bb5" },
}

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
      color: "text-primary",
    },
    {
      title: "Total Revenue",
      value: `$${(data.totalRevenue / 1000).toFixed(0)}K`,
      change: `+${data.financialMetrics.monthlyGrowth}%`,
      trend: "up",
      icon: DollarSign,
      color: "text-success",
    },
    {
      title: "Course Completion",
      value: `${data.courseCompletionRate}%`,
      change: "+3%",
      trend: "up",
      icon: Award,
      color: "text-primary",
    },
    {
      title: "Active Courses",
      value: data.activeCourses.toString(),
      change: "+2",
      trend: "up",
      icon: BookOpen,
      color: "text-warning",
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
            <p className="text-destructive mb-4">Error loading analytics data: {error}</p>
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
            <h2 className="text-3xl font-medium tracking-tight text-foreground">Reports & Analytics</h2>
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
                    <div className="text-2xl font-medium tracking-tight text-foreground">{metric.value}</div>
                    <p className="text-xs text-muted-foreground">{metric.title}</p>
                    <div className="flex items-center mt-1">
                      <TrendingUp className="h-3 w-3 text-success mr-1" />
                      <span className="text-xs text-success">{metric.change}</span>
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
                      <ChartContainer config={chartConfig} className="!aspect-auto h-full w-full">
                        <AreaChart data={data.enrollmentTrends} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
                          <XAxis 
                            dataKey="month" 
                            tick={{ fontSize: 12, fill: '#000' }}
                            tickLine={{ stroke: '#666' }}
                            axisLine={{ stroke: '#666' }}
                          />
                          <YAxis 
                            yAxisId="left"
                            tick={{ fontSize: 12, fill: '#000' }}
                            tickLine={{ stroke: '#666' }}
                            axisLine={{ stroke: '#666' }}
                          />
                          <YAxis 
                            yAxisId="right" 
                            orientation="right"
                            tick={{ fontSize: 12, fill: '#000' }}
                            tickLine={{ stroke: '#666' }}
                            axisLine={{ stroke: '#666' }}
                          />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Area
                            yAxisId="left"
                            type="monotone"
                            dataKey="students"
                            stroke="var(--color-students)"
                            fill="var(--color-students)"
                            fillOpacity={0.4}
                          />
                          <Area
                            yAxisId="right"
                            type="monotone"
                            dataKey="revenue"
                            stroke="var(--color-revenue)"
                            fill="var(--color-revenue)"
                            fillOpacity={0.4}
                          />
                        </AreaChart>
                      </ChartContainer>
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
                      <ChartContainer config={chartConfig} className="!aspect-auto h-full w-full">
                        <BarChart data={data.coursePerformance.slice(0, 5)} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
                          <XAxis 
                            dataKey="courseName" 
                            tick={{ fontSize: 10, fill: '#000' }}
                            tickLine={{ stroke: '#666' }}
                            axisLine={{ stroke: '#666' }}
                            angle={-45}
                            textAnchor="end"
                            height={80}
                          />
                          <YAxis 
                            tick={{ fontSize: 12, fill: '#000' }}
                            tickLine={{ stroke: '#666' }}
                            axisLine={{ stroke: '#666' }}
                          />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <ChartLegend content={<ChartLegendContent />} />
                          <Bar dataKey="enrolled" fill="var(--color-enrolled)" name="Enrolled" />
                          <Bar dataKey="completed" fill="var(--color-completed)" name="Completed" />
                        </BarChart>
                      </ChartContainer>
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
                      <ChartContainer config={chartConfig} className="!aspect-auto h-full w-full">
                        <PieChart margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                          <Pie
                            data={data.revenueBreakdown}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={((props: { source?: string; percentage?: number }) =>
                              `${props.source ?? ""} (${props.percentage ?? 0}%)`
                            ) as never}
                            outerRadius={80}
                            fill="#6b5bb5"
                            dataKey="amount"
                          >
                            {data.revenueBreakdown.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <ChartTooltip content={<ChartTooltipContent />} />
                        </PieChart>
                      </ChartContainer>
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
                      <ChartContainer config={chartConfig} className="!aspect-auto h-full w-full">
                        <PieChart margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                          <Pie
                            data={[
                              { name: 'On Track', value: data.studentProgress.onTrack, color: '#2f8a64' },
                              { name: 'Behind Schedule', value: data.studentProgress.behindSchedule, color: '#be353b' },
                              { name: 'Ahead of Schedule', value: data.studentProgress.aheadOfSchedule, color: '#2054a0' }
                            ]}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${percent ? (percent * 100).toFixed(0) : 0}%`}
                            outerRadius={100}
                            fill="#6b5bb5"
                            dataKey="value"
                          >
                            <Cell key="cell-0" fill="#2f8a64" />
                            <Cell key="cell-1" fill="#be353b" />
                            <Cell key="cell-2" fill="#2054a0" />
                          </Pie>
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <ChartLegend content={<ChartLegendContent />} />
                        </PieChart>
                      </ChartContainer>
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
                      <ChartContainer config={chartConfig} className="!aspect-auto h-full w-full">
                        <ScatterChart data={data.coursePerformance} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
                          <XAxis 
                            dataKey="enrolled" 
                            name="Enrolled"
                            tick={{ fontSize: 12, fill: '#000' }}
                            tickLine={{ stroke: '#666' }}
                            axisLine={{ stroke: '#666' }}
                          />
                          <YAxis 
                            dataKey="revenue" 
                            name="Revenue"
                            tick={{ fontSize: 12, fill: '#000' }}
                            tickLine={{ stroke: '#666' }}
                            axisLine={{ stroke: '#666' }}
                          />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Scatter dataKey="revenue" fill="#6b5bb5" />
                        </ScatterChart>
                      </ChartContainer>
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
                      <ChartContainer config={chartConfig} className="!aspect-auto h-full w-full">
                        <PieChart margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                          <Pie
                            data={data.coursePerformance.slice(0, 6)}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={((props: { courseName?: string; completionRate?: number }) =>
                              `${props.courseName ?? ""}: ${props.completionRate ?? 0}%`
                            ) as never}
                            outerRadius={100}
                            fill="#6b5bb5"
                            dataKey="completionRate"
                            nameKey="courseName"
                          >
                            {data.coursePerformance.slice(0, 6).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <ChartLegend content={<ChartLegendContent />} />
                        </PieChart>
                      </ChartContainer>
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
                      <ChartContainer config={chartConfig} className="!aspect-auto h-full w-full">
                        <ComposedChart data={data.enrollmentTrends} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
                          <XAxis 
                            dataKey="month" 
                            tick={{ fontSize: 12, fill: '#000' }}
                            tickLine={{ stroke: '#666' }}
                            axisLine={{ stroke: '#666' }}
                          />
                          <YAxis 
                            yAxisId="left"
                            tick={{ fontSize: 12, fill: '#000' }}
                            tickLine={{ stroke: '#666' }}
                            axisLine={{ stroke: '#666' }}
                          />
                          <YAxis 
                            yAxisId="right" 
                            orientation="right"
                            tick={{ fontSize: 12, fill: '#000' }}
                            tickLine={{ stroke: '#666' }}
                            axisLine={{ stroke: '#666' }}
                          />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <ChartLegend content={<ChartLegendContent />} />
                          <Bar yAxisId="left" dataKey="students" fill="var(--color-students)" name="Students" />
                          <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="var(--color-revenue)" strokeWidth={3} name="Revenue" />
                        </ComposedChart>
                      </ChartContainer>
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
                      <ChartContainer config={chartConfig} className="!aspect-auto h-full w-full">
                        <PieChart margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                          <Pie
                            data={[
                              { name: 'On Track', value: data.studentProgress.onTrack, color: '#2f8a64' },
                              { name: 'Behind Schedule', value: data.studentProgress.behindSchedule, color: '#be353b' },
                              { name: 'Ahead of Schedule', value: data.studentProgress.aheadOfSchedule, color: '#2054a0' }
                            ]}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={(props: { name?: string; percent?: number; percentage?: number }) =>
                              `${props.name ?? ""} (${Math.round((props.percentage ?? (props.percent ?? 0) * 100))}%)`
                            }
                            outerRadius={80}
                            fill="#6b5bb5"
                            dataKey="value"
                          >
                            {[
                              { name: 'On Track', value: data.studentProgress.onTrack, color: '#2f8a64' },
                              { name: 'Behind Schedule', value: data.studentProgress.behindSchedule, color: '#be353b' },
                              { name: 'Ahead of Schedule', value: data.studentProgress.aheadOfSchedule, color: '#2054a0' }
                            ].map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <ChartTooltip content={<ChartTooltipContent />} />
                        </PieChart>
                      </ChartContainer>
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
                      <ChartContainer config={chartConfig} className="!aspect-auto h-full w-full">
                        <LineChart data={data.enrollmentTrends} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
                          <XAxis 
                            dataKey="month" 
                            tick={{ fontSize: 12, fill: '#000' }}
                            tickLine={{ stroke: '#666' }}
                            axisLine={{ stroke: '#666' }}
                          />
                          <YAxis 
                            tick={{ fontSize: 12, fill: '#000' }}
                            tickLine={{ stroke: '#666' }}
                            axisLine={{ stroke: '#666' }}
                          />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Line 
                            type="monotone" 
                            dataKey="students" 
                            stroke="var(--color-students)" 
                            strokeWidth={3}
                            dot={{ fill: 'var(--color-students)', strokeWidth: 2, r: 4 }}
                            activeDot={{ r: 6, stroke: 'var(--color-students)', strokeWidth: 2 }}
                          />
                        </LineChart>
                      </ChartContainer>
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
                        <Badge variant="outline" className="bg-success-soft text-success">{data.studentProgress.onTrack}%</Badge>
                      </div>
                    </div>
                    <Progress value={data.studentProgress.onTrack} className="h-2" />
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Behind Schedule</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-muted-foreground">{data.studentProgress.behindSchedule}%</span>
                        <Badge variant="outline" className="bg-destructive-soft text-destructive">{data.studentProgress.behindSchedule}%</Badge>
                      </div>
                    </div>
                    <Progress value={data.studentProgress.behindSchedule} className="h-2" />
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Ahead of Schedule</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-muted-foreground">{data.studentProgress.aheadOfSchedule}%</span>
                        <Badge variant="outline" className="bg-primary-soft text-primary">{data.studentProgress.aheadOfSchedule}%</Badge>
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
                      <ChartContainer config={chartConfig} className="!aspect-auto h-full w-full">
                        <RadarChart data={data.coursePerformance.slice(0, 4).map(course => ({
                          course: course.courseName,
                          enrollment: course.enrolled,
                          completion: course.completed,
                          revenue: course.revenue / 1000, // Scale down for radar chart
                          completionRate: course.completionRate
                        }))} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
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
                            stroke="var(--color-enrollment)" 
                            fill="var(--color-enrollment)" 
                            fillOpacity={0.3} 
                          />
                          <Radar 
                            name="Completion" 
                            dataKey="completion" 
                            stroke="var(--color-completion)" 
                            fill="var(--color-completion)" 
                            fillOpacity={0.3} 
                          />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <ChartLegend content={<ChartLegendContent />} />
                        </RadarChart>
                      </ChartContainer>
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
                      <ChartContainer config={chartConfig} className="!aspect-auto h-full w-full">
                        <ScatterChart data={data.coursePerformance} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
                          <XAxis 
                            dataKey="completionRate" 
                            name="Completion Rate"
                            tick={{ fontSize: 12, fill: '#000' }}
                            tickLine={{ stroke: '#666' }}
                            axisLine={{ stroke: '#666' }}
                          />
                          <YAxis 
                            dataKey="revenue" 
                            name="Revenue"
                            tick={{ fontSize: 12, fill: '#000' }}
                            tickLine={{ stroke: '#666' }}
                            axisLine={{ stroke: '#666' }}
                          />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Scatter dataKey="revenue" fill="#6b5bb5" />
                        </ScatterChart>
                      </ChartContainer>
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
                            <div className="text-xl font-semibold text-foreground">${course.revenue.toLocaleString()}</div>
                            <p className="text-xs text-muted-foreground">Revenue</p>
                          </div>
                        </div>
                        <div className="grid gap-4 md:grid-cols-3">
                          <div className="text-center p-3 bg-muted rounded">
                            <div className="text-lg font-semibold text-primary">{course.enrolled}</div>
                            <p className="text-xs text-muted-foreground">Enrolled</p>
                          </div>
                          <div className="text-center p-3 bg-muted rounded">
                            <div className="text-lg font-semibold text-success">{course.completed}</div>
                            <p className="text-xs text-muted-foreground">Completed</p>
                          </div>
                          <div className="text-center p-3 bg-muted rounded">
                            <div className="text-lg font-semibold text-primary">{course.completionRate}%</div>
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
                      <ChartContainer config={chartConfig} className="!aspect-auto h-full w-full">
                        <AreaChart data={data.enrollmentTrends} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
                          <XAxis 
                            dataKey="month" 
                            tick={{ fontSize: 12, fill: '#000' }}
                            tickLine={{ stroke: '#666' }}
                            axisLine={{ stroke: '#666' }}
                          />
                          <YAxis 
                            tick={{ fontSize: 12, fill: '#000' }}
                            tickLine={{ stroke: '#666' }}
                            axisLine={{ stroke: '#666' }}
                          />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Area 
                            type="monotone" 
                            dataKey="revenue" 
                            stroke="var(--color-revenue)" 
                            fill="var(--color-revenue)" 
                            fillOpacity={0.4}
                          />
                        </AreaChart>
                      </ChartContainer>
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
                      <ChartContainer config={chartConfig} className="!aspect-auto h-full w-full">
                        <BarChart data={data.revenueBreakdown.slice(0, 5)} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
                          <XAxis 
                            dataKey="source" 
                            tick={{ fontSize: 10, fill: '#000' }}
                            tickLine={{ stroke: '#666' }}
                            axisLine={{ stroke: '#666' }}
                            angle={-45}
                            textAnchor="end"
                            height={80}
                          />
                          <YAxis 
                            tick={{ fontSize: 12, fill: '#000' }}
                            tickLine={{ stroke: '#666' }}
                            axisLine={{ stroke: '#666' }}
                          />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="amount" fill="var(--color-amount)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ChartContainer>
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
                      <div className="flex items-center justify-between p-3 bg-success-soft rounded">
                        <span className="font-medium text-success">Total Revenue</span>
                        <span className="text-lg font-bold text-success">${data.financialMetrics.totalRevenue.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-destructive-soft rounded">
                        <span className="font-medium text-destructive">Outstanding Payments</span>
                        <span className="text-lg font-bold text-destructive">${data.financialMetrics.outstandingPayments.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-primary-soft rounded">
                        <span className="font-medium text-primary">Average Course Price</span>
                        <span className="text-lg font-bold text-primary">${data.financialMetrics.averageCoursePrice.toFixed(0)}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-primary-soft rounded">
                        <span className="font-medium text-primary">Monthly Growth</span>
                        <span className="text-lg font-bold text-primary">+{data.financialMetrics.monthlyGrowth}%</span>
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
                      <ChartContainer config={chartConfig} className="!aspect-auto h-full w-full">
                        <ScatterChart data={data.enrollmentTrends} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
                          <XAxis 
                            dataKey="students" 
                            name="Students"
                            tick={{ fontSize: 12, fill: '#000' }}
                            tickLine={{ stroke: '#666' }}
                            axisLine={{ stroke: '#666' }}
                          />
                          <YAxis 
                            dataKey="revenue" 
                            name="Revenue"
                            tick={{ fontSize: 12, fill: '#000' }}
                            tickLine={{ stroke: '#666' }}
                            axisLine={{ stroke: '#666' }}
                          />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Scatter dataKey="revenue" fill="var(--color-revenue)" />
                        </ScatterChart>
                      </ChartContainer>
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
                      <ChartContainer config={chartConfig} className="!aspect-auto h-full w-full">
                        <ComposedChart data={data.enrollmentTrends} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
                          <XAxis 
                            dataKey="month" 
                            tick={{ fontSize: 12, fill: '#000' }}
                            tickLine={{ stroke: '#666' }}
                            axisLine={{ stroke: '#666' }}
                          />
                          <YAxis 
                            yAxisId="left"
                            tick={{ fontSize: 12, fill: '#000' }}
                            tickLine={{ stroke: '#666' }}
                            axisLine={{ stroke: '#666' }}
                          />
                          <YAxis 
                            yAxisId="right" 
                            orientation="right"
                            tick={{ fontSize: 12, fill: '#000' }}
                            tickLine={{ stroke: '#666' }}
                            axisLine={{ stroke: '#666' }}
                          />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <ChartLegend content={<ChartLegendContent />} />
                          <Bar yAxisId="left" dataKey="students" fill="var(--color-students)" name="Students" />
                          <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="var(--color-revenue)" strokeWidth={3} name="Revenue" />
                        </ComposedChart>
                      </ChartContainer>
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
