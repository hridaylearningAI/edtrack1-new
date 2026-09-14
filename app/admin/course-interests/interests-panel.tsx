'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RefreshCw, Loader2, Mail, Phone, BookOpen, LockOpen, Lock, ChevronDown, ChevronRight, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { useAuth } from '@clerk/nextjs'

interface CourseInfo {
  id: number
  name: string
  course_code?: string
}

interface CourseInterestRecord {
  id: number
  course_id: number
  email: string
  name: string
  mobile: string | null
  region: string | null
  user_id: number | null
  created_at: string
  updated_at: string
  unlocked_at: string | null
  unlocked_by_user_id: number | null
  eligibility_status: string | null
  courses: CourseInfo | null
}

export default function CourseInterestsPage() {
  const { getToken } = useAuth()
  const [interests, setInterests] = useState<CourseInterestRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [courseFilter, setCourseFilter] = useState<string>('all')
  const [actionId, setActionId] = useState<number | null>(null)
  const [expandedCourseIds, setExpandedCourseIds] = useState<Set<number>>(new Set())

  const fetchInterests = async () => {
    try {
      setLoading(true)
      let authToken: string | null = null
      try {
        if (getToken) authToken = await getToken()
        if (!authToken) authToken = sessionStorage.getItem('clerk_auth_token')
      } catch {
        authToken = sessionStorage.getItem('clerk_auth_token')
      }

      const response = await fetch('/api/admin/course-interests', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken && { Authorization: `Bearer ${authToken}` }),
        },
      })
      const json = await response.json()

      if (!response.ok) {
        toast.error(json.error || 'Failed to fetch course interests')
        return
      }
      if (json.success && Array.isArray(json.data)) {
        setInterests(json.data)
      } else {
        setInterests([])
      }
    } catch (err) {
      console.error('Fetch course interests:', err)
      toast.error('Failed to fetch course interests')
      setInterests([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInterests()
  }, [])

  const courseOptions = useMemo(() => {
    const byId = new Map<number, CourseInfo>()
    interests.forEach((r) => {
      if (r.courses && !byId.has(r.courses.id)) {
        byId.set(r.courses.id, r.courses)
      }
    })
    return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [interests])

  const filteredInterests = courseFilter === 'all'
    ? interests
    : interests.filter((r) => r.course_id === parseInt(courseFilter, 10))

  const interestsByCourse = useMemo(() => {
    const map = new Map<number, { course: CourseInfo; interests: CourseInterestRecord[] }>()
    interests.forEach((r) => {
      const course = r.courses ?? { id: r.course_id, name: `Course #${r.course_id}` }
      if (!map.has(r.course_id)) map.set(r.course_id, { course, interests: [] })
      map.get(r.course_id)!.interests.push(r)
    })
    return Array.from(map.entries())
      .map(([id, v]) => ({ courseId: id, ...v }))
      .sort((a, b) => a.course.name.localeCompare(b.course.name))
  }, [interests])

  const toggleCourse = (courseId: number) => {
    setExpandedCourseIds((prev) => {
      const next = new Set(prev)
      if (next.has(courseId)) next.delete(courseId)
      else next.add(courseId)
      return next
    })
  }

  const getEligibilityBadge = (status: string | null) => {
    if (!status) return <span className="text-muted-foreground text-sm">—</span>
    switch (status) {
      case 'eligible':
        return <Badge className="bg-success hover:bg-success"><CheckCircle2 className="h-3 w-3 mr-1" />Eligible</Badge>
      case 'not_eligible':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Not eligible</Badge>
      case 'pending':
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
      case 'under_review':
      case 'needs_review':
        return <Badge className="bg-warning hover:bg-warning"><Clock className="h-3 w-3 mr-1" />Review</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const handleUnlock = async (record: CourseInterestRecord) => {
    setActionId(record.id)
    try {
      let authToken: string | null = null
      try {
        if (getToken) authToken = await getToken()
        if (!authToken) authToken = sessionStorage.getItem('clerk_auth_token')
      } catch {
        authToken = sessionStorage.getItem('clerk_auth_token')
      }
      const res = await fetch(`/api/admin/course-interests/${record.id}/unlock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken && { Authorization: `Bearer ${authToken}` }),
        },
      })
      const json = await res.json()
      if (json.success) {
        toast.success('Course unlocked — they can now see plans and purchase.')
        await fetchInterests()
      } else {
        toast.error(json.error || 'Failed to unlock')
      }
    } catch (err) {
      toast.error('Failed to unlock')
    } finally {
      setActionId(null)
    }
  }

  const handleRevoke = async (record: CourseInterestRecord) => {
    setActionId(record.id)
    try {
      let authToken: string | null = null
      try {
        if (getToken) authToken = await getToken()
        if (!authToken) authToken = sessionStorage.getItem('clerk_auth_token')
      } catch {
        authToken = sessionStorage.getItem('clerk_auth_token')
      }
      const res = await fetch(`/api/admin/course-interests/${record.id}/revoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken && { Authorization: `Bearer ${authToken}` }),
        },
      })
      const json = await res.json()
      if (json.success) {
        toast.success('Unlock revoked.')
        await fetchInterests()
      } else {
        toast.error(json.error || 'Failed to revoke')
      }
    } catch (err) {
      toast.error('Failed to revoke')
    } finally {
      setActionId(null)
    }
  }

  return (
          <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl sm:text-3xl font-medium tracking-tight text-foreground">Course Interests</h2>
            <p className="text-muted-foreground mt-1">
              People who have shown interest in NCLEX and other courses
            </p>
          </div>
          <Button variant="outline" onClick={fetchInterests} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </>
            )}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Interest submissions</CardTitle>
            <CardDescription>
              Select a course to see students who showed interest. Click a course name to expand and view students.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-6">
              <Select value={courseFilter} onValueChange={(v) => setCourseFilter(v)}>
                <SelectTrigger className="w-[320px]">
                  <SelectValue placeholder="Select a course" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All courses (click course name to expand)</SelectItem>
                  {courseOptions.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                      {c.course_code ? ` (${c.course_code})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">
                {filteredInterests.length} submission{filteredInterests.length !== 1 ? 's' : ''}
              </span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : interestsByCourse.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No interest submissions found.
              </div>
            ) : (
              <div className="space-y-2">
                {(courseFilter === 'all' ? interestsByCourse : interestsByCourse.filter((g) => g.courseId === parseInt(courseFilter, 10))).map(({ courseId, course, interests: list }) => {
                  const isExpanded = courseFilter !== 'all' || expandedCourseIds.has(courseId)
                  return (
                    <div key={courseId} className="rounded-lg border bg-card">
                      <button
                        type="button"
                        onClick={() => courseFilter === 'all' ? toggleCourse(courseId) : undefined}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left font-medium hover:bg-muted/50 rounded-t-lg ${courseFilter === 'all' ? 'cursor-pointer' : 'cursor-default'}`}
                      >
                        {courseFilter === 'all' && (
                          isExpanded ? <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                        )}
                        <BookOpen className="h-4 w-4 shrink-0 text-brand-blue" />
                        <span>{course.name}</span>
                        {course.course_code && <span className="text-muted-foreground text-sm">({course.course_code})</span>}
                        <span className="text-muted-foreground text-sm ml-auto">{list.length} student{list.length !== 1 ? 's' : ''}</span>
                      </button>
                      {isExpanded && (
                        <div className="border-t overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Mobile</TableHead>
                                <TableHead>Region</TableHead>
                                <TableHead>Eligibility</TableHead>
                                <TableHead>Unlock</TableHead>
                                <TableHead>Submitted</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {list.map((row) => (
                                <TableRow key={row.id}>
                                  <TableCell className="font-medium">{row.name}</TableCell>
                                  <TableCell>
                                    <a href={`mailto:${row.email}`} className="text-brand-blue hover:underline flex items-center gap-2">
                                      <Mail className="h-4 w-4 shrink-0" />{row.email}
                                    </a>
                                  </TableCell>
                                  <TableCell>
                                    {row.mobile ? (
                                      <a href={`tel:${row.mobile}`} className="text-brand-blue hover:underline flex items-center gap-2">
                                        <Phone className="h-4 w-4 shrink-0" />{row.mobile}
                                      </a>
                                    ) : (
                                      <span className="text-muted-foreground">—</span>
                                    )}
                                  </TableCell>
                                  <TableCell>{row.region || '—'}</TableCell>
                                  <TableCell>{getEligibilityBadge(row.eligibility_status)}</TableCell>
                                  <TableCell>
                                    {row.unlocked_at ? (
                                      <Badge className="bg-success hover:bg-success"><LockOpen className="h-3 w-3 mr-1" />Unlocked</Badge>
                                    ) : (
                                      <span className="text-muted-foreground text-sm">—</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-muted-foreground text-sm">
                                    {format(new Date(row.created_at), 'MMM d, yyyy')}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {row.unlocked_at ? (
                                      <Button variant="outline" size="sm" disabled={actionId === row.id} onClick={() => handleRevoke(row)}>
                                        {actionId === row.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Lock className="h-4 w-4 mr-1" />Revoke</>}
                                      </Button>
                                    ) : (
                                      <Button variant="default" size="sm" disabled={actionId === row.id} onClick={() => handleUnlock(row)}>
                                        {actionId === row.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><LockOpen className="h-4 w-4 mr-1" />Unlock</>}
                                      </Button>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
  )
}
