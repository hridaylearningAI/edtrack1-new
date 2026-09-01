"use client"

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Search,
  ExternalLink,
  Filter
} from "lucide-react"
import { toast } from "sonner"
import { useCourses } from "@/lib/hooks/useCourses"
import { useUser } from "@/lib/hooks/useUser"
import { Course } from "@/lib/api"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function StripeSyncPage() {
  const { courses, loading, fetchCourses } = useCourses()
  const { getAccessToken } = useUser()
  const [syncingCourses, setSyncingCourses] = useState<Set<number>>(new Set())
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [syncedCourses, setSyncedCourses] = useState<Set<number>>(new Set())

  useEffect(() => {
    fetchCourses()
  }, [fetchCourses])

  // Track which courses are synced
  useEffect(() => {
    if (courses) {
      const synced = new Set(
        courses
          .filter(c => c.stripe_product_id)
          .map(c => c.id)
      )
      setSyncedCourses(synced)
    }
  }, [courses])

  const handleSyncCourse = async (course: Course) => {
    if (!course.price_without_certificate && !course.price_with_certificate) {
      toast.error(`${course.name} must have at least one price before syncing with Stripe`)
      return
    }

    setSyncingCourses(prev => new Set(prev).add(course.id))

    try {
      // Get authentication token
      const token = await getAccessToken()
      if (!token) {
        toast.error('Authentication required. Please log in again.')
        return
      }

      const response = await fetch(`/api/courses/${course.id}/sync-stripe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (data.success) {
        toast.success(`${course.name} synced with Stripe successfully`)
        setSyncedCourses(prev => new Set(prev).add(course.id))
        // Refresh courses list
        fetchCourses()
      } else {
        toast.error(data.message || `Failed to sync ${course.name} with Stripe`)
      }
    } catch (error) {
      console.error('Error syncing course with Stripe:', error)
      toast.error(`Failed to sync ${course.name} with Stripe`)
    } finally {
      setSyncingCourses(prev => {
        const next = new Set(prev)
        next.delete(course.id)
        return next
      })
    }
  }

  const handleSyncAll = async () => {
    if (!courses) return

    const coursesToSync = courses.filter(
      c => (c.price_without_certificate || c.price_with_certificate) && !syncedCourses.has(c.id)
    )

    if (coursesToSync.length === 0) {
      toast.info('All eligible courses are already synced')
      return
    }

    if (!confirm(`Sync ${coursesToSync.length} courses with Stripe?`)) {
      return
    }

    // Sync all courses sequentially
    for (const course of coursesToSync) {
      await handleSyncCourse(course)
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    toast.success(`Synced ${coursesToSync.length} courses with Stripe`)
  }

  // Filter courses
  const filteredCourses = courses?.filter(course => {
    const matchesSearch = !searchTerm || 
      course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.course_code?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'synced' && syncedCourses.has(course.id)) ||
      (statusFilter === 'not_synced' && !syncedCourses.has(course.id)) ||
      (statusFilter === 'no_price' && !course.price_without_certificate && !course.price_with_certificate)

    return matchesSearch && matchesStatus
  }) || []

  const syncedCount = syncedCourses.size
  const totalCount = courses?.length || 0
  const eligibleCount = courses?.filter(
    c => c.price_without_certificate || c.price_with_certificate
  ).length || 0

  return (
          <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <RefreshCw className="h-8 w-8 text-blue-600" />
              Stripe Product Sync
            </h2>
            <p className="text-muted-foreground mt-2">
              Sync courses with Stripe products to enable coupon discounts
            </p>
          </div>
          <Button
            onClick={handleSyncAll}
            disabled={loading || eligibleCount === syncedCount}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Sync All Eligible Courses
          </Button>
        </div>

        {/* Statistics */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-foreground">{totalCount}</div>
                  <p className="text-xs text-muted-foreground">Total Courses</p>
                </div>
                <RefreshCw className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-green-600">{syncedCount}</div>
                  <p className="text-xs text-muted-foreground">Synced with Stripe</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-yellow-600">{totalCount - syncedCount}</div>
                  <p className="text-xs text-muted-foreground">Not Synced</p>
                </div>
                <AlertCircle className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-foreground">{eligibleCount}</div>
                  <p className="text-xs text-muted-foreground">Eligible to Sync</p>
                </div>
                <RefreshCw className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-4 items-center">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search courses by name or code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[200px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Courses</SelectItem>
                  <SelectItem value="synced">Synced</SelectItem>
                  <SelectItem value="not_synced">Not Synced</SelectItem>
                  <SelectItem value="no_price">No Price</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Courses List */}
        <div className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-muted-foreground">Loading courses...</p>
              </CardContent>
            </Card>
          ) : filteredCourses.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <AlertCircle className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No courses found</p>
              </CardContent>
            </Card>
          ) : (
            filteredCourses.map((course) => {
              const isSynced = syncedCourses.has(course.id)
              const isSyncing = syncingCourses.has(course.id)
              const hasPrice = !!(course.price_without_certificate || course.price_with_certificate)

              return (
                <Card key={course.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{course.name}</h3>
                          {isSynced ? (
                            <Badge variant="default" className="bg-green-600">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Synced
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Not Synced
                            </Badge>
                          )}
                          {!hasPrice && (
                            <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                              No Price
                            </Badge>
                          )}
                        </div>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          {course.course_code && (
                            <p>Code: <span className="font-mono">{course.course_code}</span></p>
                          )}
                          <div className="flex gap-4">
                            {course.price_without_certificate && (
                              <p>Without Cert: ${course.price_without_certificate.toFixed(2)}</p>
                            )}
                            {course.price_with_certificate && (
                              <p>With Cert: ${course.price_with_certificate.toFixed(2)}</p>
                            )}
                          </div>
                          {isSynced && course.stripe_product_id && (
                            <div className="flex items-center gap-2 mt-2">
                              <p className="text-xs">Stripe Product ID:</p>
                              <code className="text-xs bg-muted px-2 py-1 rounded">
                                {course.stripe_product_id}
                              </code>
                              <a
                                href={`https://dashboard.stripe.com/products/${course.stripe_product_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline flex items-center gap-1"
                              >
                                <ExternalLink className="h-3 w-3" />
                                View in Stripe
                              </a>
                            </div>
                          )}
                          {course.stripe_synced_at && (
                            <p className="text-xs">
                              Last synced: {new Date(course.stripe_synced_at).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="ml-4">
                        <Button
                          onClick={() => handleSyncCourse(course)}
                          disabled={isSyncing || !hasPrice}
                          variant={isSynced ? "outline" : "default"}
                          className="flex items-center gap-2"
                        >
                          {isSyncing ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Syncing...
                            </>
                          ) : isSynced ? (
                            <>
                              <RefreshCw className="h-4 w-4" />
                              Re-sync
                            </>
                          ) : (
                            <>
                              <RefreshCw className="h-4 w-4" />
                              Sync
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      </div>
  )
}
