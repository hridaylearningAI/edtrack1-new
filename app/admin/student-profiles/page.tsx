'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Eye, Mail, Phone, MapPin, Calendar, GraduationCap, User, Clock, AlertCircle, Loader2, ArrowLeft, BookOpen, FileText, Settings, Save, Upload, RefreshCw, TrendingUp, Plus, UserMinus, Award, Ban } from "lucide-react"
import { useStudents } from "@/lib/hooks/useStudents"
import { useAdminProgress } from "@/lib/hooks/useAdminProgress"
import { useDocuments } from "@/lib/hooks/useDocuments"
import { useUser } from "@/lib/hooks/useUser"
import { StudentDetailsPanel } from "@/components/admin/student-details-panel"
import { DocumentUploadDialog } from "@/components/admin/document-upload-dialog"
import { DocumentPreviewDialog } from "@/components/admin/document-preview-dialog"
import { Student, StudentCreate, StudentUpdate, type Course } from "@/lib/api"
import { toast } from "sonner"
import { useSearchParams } from 'next/navigation'
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import { useMemo } from "react"

function StudentProfilesContent() {
  const searchParams = useSearchParams();
  const studentIdFromUrl = searchParams.get('student');
  
  const {
    students,
    loading,
    error,
    fetchStudents,
    searchStudents,
    clearError,
  } = useStudents();

  const {
    documents,
    loading: documentsLoading,
    error: documentsError,
    fetchDocuments,
    uploadDocument,
    deleteDocument,
  } = useDocuments();

  const { getAccessToken } = useUser();

  // Get real-time progress data
  const { 
    students: progressData, 
    loading: progressLoading, 
    lastUpdated, 
    refresh: refreshProgress, 
    autoRefresh, 
    setAutoRefresh 
  } = useAdminProgress(30000);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [courseFilter, setCourseFilter] = useState<string>('');
  const [enrollmentScopeFilter, setEnrollmentScopeFilter] = useState<'all' | 'enrolled' | 'not_enrolled'>('all');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isDetailsPanelOpen, setIsDetailsPanelOpen] = useState(false);
  const [showDetailedProfile, setShowDetailedProfile] = useState(false);
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [selectedCourseIdForEnroll, setSelectedCourseIdForEnroll] = useState<string | null>(null);
  const [enrollWithCertificate, setEnrollWithCertificate] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [unenrollingId, setUnenrollingId] = useState<number | null>(null);
  const [certificateUpdatingId, setCertificateUpdatingId] = useState<number | null>(null);

  // Get progress data for current student
  const currentStudentProgress = useMemo(() => {
    if (!currentStudent || !progressData) return null;
    return progressData.find(p => p.id === currentStudent.id) || null;
  }, [currentStudent, progressData]);

  // Handle search
  const handleSearch = () => {
    const params: any = {};
    if (searchTerm) params.name = searchTerm;
    if (statusFilter) params.status = statusFilter;
    
    if (Object.keys(params).length > 0) {
      searchStudents(params);
    } else {
      fetchStudents();
    }
  };

  // Handle search on Enter key
  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Handle opening student details panel
  const handleViewDetails = (student: Student) => {
    setSelectedStudent(student);
    setIsDetailsPanelOpen(true);
  };

  // Handle closing student details panel
  const handleCloseDetails = () => {
    setIsDetailsPanelOpen(false);
    setSelectedStudent(null);
  };

  // Handle showing detailed profile
  const handleShowDetailedProfile = (student: Student) => {
    setCurrentStudent(student);
    setShowDetailedProfile(true);
  };

  // Handle going back to grid view
  const handleBackToGrid = () => {
    setShowDetailedProfile(false);
    setCurrentStudent(null);
  };

  // Handle document upload for specific student
  const handleDocumentUploaded = useCallback(() => {
    if (currentStudent) {
      fetchDocuments({ student_id: currentStudent.id });
    }
  }, [currentStudent, fetchDocuments]);

  // Handle document verification
  const handleDocumentVerified = useCallback(() => {
    if (currentStudent) {
      fetchDocuments({ student_id: currentStudent.id });
    }
  }, [currentStudent, fetchDocuments]);

  // Fetch student documents when showing detailed profile
  useEffect(() => {
    if (currentStudent && showDetailedProfile) {
      fetchDocuments({ student_id: currentStudent.id });
    }
  }, [currentStudent, showDetailedProfile, fetchDocuments]);

  const courseOptions = useMemo(() => {
    const map = new Map<number, string>();
    (progressData || []).forEach((p) => {
      (p.enrollments || []).forEach((e: any) => {
        if (e?.courseId && e?.courseName && !map.has(e.courseId)) {
          map.set(e.courseId, e.courseName);
        }
      });
    });
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [progressData]);

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const studentProgress = progressData.find((p) => p.id === student.id);
      const enrollments = studentProgress?.enrollments || [];
      const hasAnyEnrollment = enrollments.length > 0;

      if (enrollmentScopeFilter === 'enrolled' && !hasAnyEnrollment) return false;
      if (enrollmentScopeFilter === 'not_enrolled' && hasAnyEnrollment) return false;

      if (courseFilter) {
        const courseId = Number(courseFilter);
        const isInCourse = enrollments.some((e: any) => Number(e.courseId) === courseId);
        if (!isInCourse) return false;
      }

      return true;
    });
  }, [students, progressData, courseFilter, enrollmentScopeFilter]);

  // Fetch all courses when showing detailed profile (for enroll dropdown)
  useEffect(() => {
    if (!showDetailedProfile || !currentStudent) return;
    let cancelled = false;
    setCoursesLoading(true);
    getAccessToken()
      .then((token) => {
        if (!token || cancelled) return;
        return fetch('/api/courses?limit=200', {
          headers: { Authorization: `Bearer ${token}` },
        });
      })
      .then((res) => (res?.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data?.success && Array.isArray(data?.data)) setAllCourses(data.data);
      })
      .catch(() => { if (!cancelled) setAllCourses([]); })
      .finally(() => { if (!cancelled) setCoursesLoading(false); });
    return () => { cancelled = true; };
  }, [showDetailedProfile, currentStudent, getAccessToken]);

  const handleEnrollInCourse = useCallback(async () => {
    if (!currentStudent || !selectedCourseIdForEnroll) return;
    const courseId = Number(selectedCourseIdForEnroll);
    if (!Number.isInteger(courseId)) return;
    setEnrolling(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        toast.error('Not authenticated');
        return;
      }
      const res = await fetch('/api/enrollments', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          student_id: currentStudent.id,
          course_id: courseId,
          status: 'enrolled',
          with_certificate: enrollWithCertificate,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success) {
        toast.success('Student enrolled in course successfully');
        setSelectedCourseIdForEnroll(null);
        refreshProgress();
      } else if (res.status === 409) {
        toast.error('Student is already enrolled in this course');
      } else {
        toast.error(data?.message || data?.error || 'Failed to enroll');
      }
    } catch {
      toast.error('Failed to enroll student');
    } finally {
      setEnrolling(false);
    }
  }, [currentStudent, selectedCourseIdForEnroll, enrollWithCertificate, getAccessToken, refreshProgress]);

  const handleUnenroll = useCallback(async (enrollment: { id: number; courseName: string }) => {
    if (!currentStudent) return;
    if (!window.confirm(`Remove this student from "${enrollment.courseName}"? They will no longer have access to the course.`)) return;
    setUnenrollingId(enrollment.id);
    try {
      const token = await getAccessToken();
      if (!token) {
        toast.error('Not authenticated');
        return;
      }
      const res = await fetch(`/api/enrollments/${enrollment.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Student removed from ${enrollment.courseName}`);
        refreshProgress();
      } else {
        toast.error(data.message || 'Failed to unenroll');
      }
    } catch {
      toast.error('Failed to unenroll');
    } finally {
      setUnenrollingId(null);
    }
  }, [currentStudent, getAccessToken, refreshProgress]);

  const handleUpdateCertificate = useCallback(async (enrollment: { id: number; courseName: string }, withCertificate: boolean) => {
    if (!currentStudent) return;
    const action = withCertificate ? 'add certificate to' : 'remove certificate from';
    if (!window.confirm(`${withCertificate ? 'Upgrade' : 'Remove certificate'}: ${action} "${enrollment.courseName}"?`)) return;
    setCertificateUpdatingId(enrollment.id);
    try {
      const token = await getAccessToken();
      if (!token) {
        toast.error('Not authenticated');
        return;
      }
      const res = await fetch(`/api/enrollments/${enrollment.id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ with_certificate: withCertificate }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(withCertificate ? `Certificate added to ${enrollment.courseName}` : `Certificate removed from ${enrollment.courseName}`);
        refreshProgress();
      } else {
        toast.error(data.message || 'Failed to update certificate');
      }
    } catch {
      toast.error('Failed to update certificate');
    } finally {
      setCertificateUpdatingId(null);
    }
  }, [currentStudent, getAccessToken, refreshProgress]);

  // Check if we should show detailed profile based on URL parameter
  useEffect(() => {
    if (studentIdFromUrl && students.length > 0) {
      const student = students.find(s => s.id.toString() === studentIdFromUrl);
      if (student) {
        setCurrentStudent(student);
        setShowDetailedProfile(true);
      }
    }
  }, [studentIdFromUrl, students]);

  // Clear error when component unmounts or error changes
  useEffect(() => {
    if (error) {
      toast.error(error);
      clearError();
    }
  }, [error, clearError]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default" className="border-success-line bg-success-soft text-success">Active</Badge>;
      case "completed":
        return <Badge variant="default" className="border-primary-line bg-primary-soft text-primary">Completed</Badge>;
      case "inactive":
        return <Badge variant="secondary">Inactive</Badge>;
      case "suspended":
        return <Badge variant="destructive">Suspended</Badge>;
      case "graduated":
        return <Badge variant="default" className="border-primary-line bg-primary-soft text-primary">Graduated</Badge>;
      case "withdrawn":
        return <Badge variant="outline">Withdrawn</Badge>;
      default:
        return <Badge variant="outline">{status || 'Unknown'}</Badge>;
    }
  };

  const getDocumentStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "verified":
        return <Badge variant="default" className="border-success-line bg-success-soft text-success">Verified</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      passport: 'Passport',
      visa: 'Visa',
      academic_transcript: 'Academic Transcript',
      drivers_license: 'Driver\'s License',
      birth_certificate: 'Birth Certificate',
      medical_certificate: 'Medical Certificate',
      other: 'Other'
    }
    return typeMap[type] || type
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  };

  // If showing detailed profile, render the detailed view
  if (showDetailedProfile && currentStudent) {
    return (
              <div className="space-y-6">
          {/* Header with Back Button */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={handleBackToGrid}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Student List
              </Button>
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-3xl font-medium tracking-tight text-foreground">Student Profile</h2>
                  {autoRefresh && (
                    <Badge variant="outline" className="bg-success-soft text-success border-success-line">
                      <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                      Live
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground mt-2">Detailed student information and documents</p>
                {lastUpdated && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Last updated: {lastUpdated.toLocaleTimeString()}
                  </p>
                )}
              </div>
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
                onClick={refreshProgress}
                disabled={progressLoading}
                size="sm"
              >
                {progressLoading ? (
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
            </div>
          </div>

          {/* Student Profile Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={currentStudent.avatar || "/placeholder.svg?height=80&width=80"} alt={currentStudent.name} />
                  <AvatarFallback className="text-lg">
                    {currentStudent.name.split(" ").map((n) => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <CardTitle className="text-2xl">{currentStudent.name}</CardTitle>
                  <CardDescription className="text-base mt-1">
                    Student ID: {currentStudent.student_number || currentStudent.id.toString().padStart(4, "0")} • {currentStudent.grade || 'No Grade'}
                  </CardDescription>
                  <div className="flex items-center space-x-4 mt-2">
                    {getStatusBadge(currentStudent.status || 'active')}
                    <span className="text-sm text-muted-foreground">
                      Enrolled: {currentStudent.enrollment_date 
                        ? new Date(currentStudent.enrollment_date).toLocaleDateString()
                        : 'N/A'
                      }
                    </span>
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Progress Overview Card */}
          {currentStudentProgress && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Progress Overview
                </CardTitle>
                <CardDescription>Real-time progress tracking and statistics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <div className="text-2xl font-medium tracking-tight text-foreground">{currentStudentProgress.overallProgress}%</div>
                    <p className="text-xs text-muted-foreground">Overall Progress</p>
                  </div>
                  <div>
                    <div className="text-2xl font-medium tracking-tight text-foreground">
                      {currentStudentProgress.unitsCompleted}/{currentStudentProgress.totalUnits}
                    </div>
                    <p className="text-xs text-muted-foreground">Units Completed</p>
                  </div>
                  <div>
                    <div className="text-2xl font-medium tracking-tight text-foreground">{currentStudentProgress.timeSpent}h</div>
                    <p className="text-xs text-muted-foreground">Time Spent</p>
                  </div>
                  <div>
                    <div className="text-2xl font-medium tracking-tight text-foreground">{currentStudentProgress.status}</div>
                    <p className="text-xs text-muted-foreground">Status</p>
                  </div>
                </div>
                <Progress value={currentStudentProgress.overallProgress} className="h-2" />
              </CardContent>
            </Card>
          )}

          {/* Profile Tabs */}
          <Tabs defaultValue="info" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="info">Personal & Academic</TabsTrigger>
              <TabsTrigger value="courses">Courses</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User className="mr-2 h-5 w-5" />
                    Personal & Academic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input id="fullName" value={currentStudent.name} readOnly />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input id="email" type="email" value={currentStudent.email} readOnly />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="coursePurchaseDate">First Course Purchase Date</Label>
                      <Input 
                        id="coursePurchaseDate" 
                        type="date" 
                        value={
                          currentStudentProgress && currentStudentProgress.enrollments && currentStudentProgress.enrollments.length > 0
                            ? (() => {
                                // Get the earliest enrollment date (first course purchase)
                                const dates = currentStudentProgress.enrollments
                                  .map(e => e.enrollmentDate)
                                  .filter(Boolean)
                                  .sort();
                                return dates.length > 0 ? dates[0].split('T')[0] : '';
                              })()
                            : currentStudent.enrollment_date 
                              ? currentStudent.enrollment_date.split('T')[0] 
                              : ''
                        } 
                        readOnly 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Input id="status" value={currentStudent.status || 'active'} readOnly />
                    </div>
                    {currentStudentProgress && (
                      <div className="space-y-2">
                        <Label>Overall Progress</Label>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>{currentStudentProgress.overallProgress}%</span>
                          </div>
                          <Progress value={currentStudentProgress.overallProgress} className="h-2" />
                        </div>
                      </div>
                    )}
                  </div>
                  {currentStudentProgress && currentStudentProgress.enrollments && currentStudentProgress.enrollments.length > 1 && (
                    <div className="space-y-2 pt-4 border-t">
                      <Label>All Course Purchase Dates</Label>
                      <div className="space-y-2">
                        {currentStudentProgress.enrollments.map((enrollment: any) => (
                          <div key={enrollment.id} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between text-sm p-2 bg-muted rounded">
                            <div>
                              <span className="font-medium">{enrollment.courseName}</span>
                              <span className="block text-xs text-muted-foreground mt-0.5">
                                Plan: {enrollment.planName || enrollment.planKey || '—'}
                                {enrollment.planKey && enrollment.planName ? (
                                  <span className="font-mono"> ({enrollment.planKey})</span>
                                ) : null}
                              </span>
                            </div>
                            <span className="text-muted-foreground shrink-0">
                              {new Date(enrollment.enrollmentDate).toLocaleDateString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="courses" className="space-y-6">
              {/* Enroll in course */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Plus className="mr-2 h-5 w-5" />
                    Enroll in Course
                  </CardTitle>
                  <CardDescription>
                    Add this student to a course directly
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {coursesLoading ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Loading courses...</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col gap-4">
                        <div className="flex flex-col sm:flex-row gap-3">
                        <Select
                          value={selectedCourseIdForEnroll ?? ''}
                          onValueChange={(v) => setSelectedCourseIdForEnroll(v || null)}
                          disabled={enrolling}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Select a course..." />
                          </SelectTrigger>
                          <SelectContent>
                            {allCourses
                              .filter(
                                (c) =>
                                  !currentStudentProgress?.enrollments?.some(
                                    (e: { courseId: number }) => e.courseId === c.id
                                  )
                              )
                              .map((c) => (
                                <SelectItem key={c.id} value={String(c.id)}>
                                  {c.name}
                                  {c.course_code ? ` (${c.course_code})` : ''}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <Button
                          onClick={handleEnrollInCourse}
                          disabled={!selectedCourseIdForEnroll || enrolling}
                        >
                          {enrolling ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Enrolling...
                            </>
                          ) : (
                            <>
                              <Plus className="mr-2 h-4 w-4" />
                              Enroll
                            </>
                          )}
                        </Button>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            id="enroll-with-certificate"
                            checked={enrollWithCertificate}
                            onCheckedChange={setEnrollWithCertificate}
                          />
                          <Label htmlFor="enroll-with-certificate" className="text-sm font-medium cursor-pointer">
                            Include certificate with enrollment
                          </Label>
                        </div>
                      </div>
                      {allCourses.filter(
                        (c) =>
                          !currentStudentProgress?.enrollments?.some(
                            (e: { courseId: number }) => e.courseId === c.id
                          )
                      ).length === 0 && !coursesLoading && (
                        <p className="text-sm text-muted-foreground">
                          No other courses available to enroll, or student is already in all courses.
                        </p>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BookOpen className="mr-2 h-5 w-5" />
                    Enrolled Courses
                  </CardTitle>
                  <CardDescription>
                    {currentStudentProgress?.enrollments?.length || 0} course(s) enrolled
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {progressLoading ? (
                    <div className="flex items-center justify-center p-8">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-muted-foreground">Loading courses...</span>
                    </div>
                  ) : currentStudentProgress && currentStudentProgress.enrollments && currentStudentProgress.enrollments.length > 0 ? (
                    <div className="space-y-4">
                      {currentStudentProgress.enrollments.map((enrollment: any) => {
                        const getProgressColor = (progress: number) => {
                          if (progress >= 80) return "bg-success";
                          if (progress >= 50) return "bg-primary";
                          if (progress >= 25) return "bg-warning";
                          return "bg-muted-foreground";
                        };

                        const getEnrollmentStatusBadge = (status: string, progress: number) => {
                          if (status === 'completed' || progress >= 100) {
                            return <Badge variant="default" className="border-success-line bg-success-soft text-success">Completed</Badge>;
                          }
                          if (progress > 0) {
                            return <Badge variant="default" className="border-primary-line bg-primary-soft text-primary">In Progress</Badge>;
                          }
                          return <Badge variant="outline">Not Started</Badge>;
                        };

                        return (
                          <Card key={enrollment.id} className="p-4">
                            <div className="space-y-3">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h5 className="font-semibold text-base">{enrollment.courseName}</h5>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    Plan:{' '}
                                    <span className="font-medium text-foreground">
                                      {enrollment.planName || enrollment.planKey || '—'}
                                    </span>
                                    {enrollment.planKey && enrollment.planName ? (
                                      <span className="font-mono text-xs ml-1">({enrollment.planKey})</span>
                                    ) : null}
                                  </p>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    Enrolled: {new Date(enrollment.enrollmentDate).toLocaleDateString()}
                                  </p>
                                  {enrollment.completionDate && (
                                    <p className="text-sm text-muted-foreground">
                                      Completed: {new Date(enrollment.completionDate).toLocaleDateString()}
                                    </p>
                                  )}
                                </div>
                                <div className="text-right">
                                  {getEnrollmentStatusBadge(enrollment.status, enrollment.progress)}
                                </div>
                              </div>
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground">Progress</span>
                                  <span className="font-semibold">{enrollment.progress}%</span>
                                </div>
                                <div className="w-full bg-muted rounded-full h-2">
                                  <div
                                    className={`h-2 rounded-full ${getProgressColor(enrollment.progress)}`}
                                    style={{ width: `${enrollment.progress}%` }}
                                  />
                                </div>
                                {enrollment.grade && (
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Grade</span>
                                    <span className="font-semibold">{enrollment.grade}</span>
                                  </div>
                                )}
                              </div>
                              {((enrollment.trialSectionsCompleted ?? 0) > 0 || (enrollment.quizAttempts?.length ?? 0) > 0) && (
                                <div className="text-xs text-muted-foreground space-y-0.5">
                                  {(enrollment.trialSectionsCompleted ?? 0) > 0 && (
                                    <div>Trial: {enrollment.trialSectionsCompleted} section(s) completed</div>
                                  )}
                                  {(enrollment.quizAttempts?.length ?? 0) > 0 && (
                                    <div>
                                      Quizzes: {enrollment.quizAttempts.length} attempt(s),{" "}
                                      {enrollment.quizAttempts.filter((a) => a.passed).length} passed
                                    </div>
                                  )}
                                </div>
                              )}
                              <div className="flex items-center gap-2 flex-wrap">
                                {enrollment.withCertificate ? (
                                  <Badge variant="secondary" className="gap-1">
                                    <Award className="h-3 w-3" />
                                    Certificate included
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-muted-foreground">No certificate</Badge>
                                )}
                                {certificateUpdatingId === enrollment.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                ) : enrollment.withCertificate ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-warning hover:text-warning hover:bg-warning-soft"
                                    onClick={() => handleUpdateCertificate(enrollment, false)}
                                  >
                                    <Ban className="h-4 w-4 mr-1" />
                                    Remove certificate
                                  </Button>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-success hover:text-success hover:bg-success-soft"
                                    onClick={() => handleUpdateCertificate(enrollment, true)}
                                  >
                                    <Award className="h-4 w-4 mr-1" />
                                    Add certificate
                                  </Button>
                                )}
                              </div>
                              <div className="flex items-center justify-between pt-2 border-t">
                                <span className="text-xs text-muted-foreground">
                                  Last updated: {new Date(enrollment.updatedAt).toLocaleDateString()}
                                </span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                  onClick={() => handleUnenroll(enrollment)}
                                  disabled={unenrollingId === enrollment.id}
                                >
                                  {unenrollingId === enrollment.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <>
                                      <UserMinus className="h-4 w-4 mr-1" />
                                      Unenroll
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center p-8">
                      <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No courses enrolled yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="mr-2 h-5 w-5" />
                    Documents
                  </CardTitle>
                  <CardDescription>Student documents and verification status</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {documentsLoading ? (
                      <div className="flex items-center justify-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        <span className="ml-2 text-muted-foreground">Loading documents...</span>
                      </div>
                    ) : documentsError ? (
                      <div className="flex items-center justify-center p-8">
                        <AlertCircle className="h-8 w-8 text-destructive" />
                        <span className="ml-2 text-destructive">Error loading documents: {documentsError}</span>
                      </div>
                    ) : documents.length === 0 ? (
                      <div className="text-center p-8">
                        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground mb-4">No documents uploaded yet</p>
                        <DocumentUploadDialog onDocumentUploaded={handleDocumentUploaded} />
                      </div>
                    ) : (
                      <>
                        <div className="space-y-3">
                          {documents.map((doc) => (
                            <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/20">
                              <div className="flex items-center space-x-3">
                                <FileText className="h-5 w-5 text-muted-foreground" />
                                <div>
                                  <div className="font-medium">{getDocumentTypeLabel(doc.document_type)}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {doc.original_name} • {formatFileSize(doc.file_size)}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    Uploaded: {new Date(doc.uploaded_at).toLocaleDateString()}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                {getDocumentStatusBadge(doc.status)}
                                <DocumentPreviewDialog 
                                  document={doc} 
                                  onVerified={handleDocumentVerified}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="pt-4 border-t">
                          <DocumentUploadDialog onDocumentUploaded={handleDocumentUploaded} />
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notes" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Settings className="mr-2 h-5 w-5" />
                    Notes & Comments
                  </CardTitle>
                  <CardDescription>Add internal notes about the student</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Textarea placeholder="Add notes about the student..." rows={6} />
                    <Button>Save Notes</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
    );
  }

  // Render the grid view
  return (
    <>
          <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div>
            <h2 className="text-2xl sm:text-3xl font-medium tracking-tight text-foreground">Student Profiles</h2>
            <p className="text-muted-foreground mt-1 sm:mt-2">
              View detailed profiles of all students
              {loading && <span className="ml-2 text-primary">(Loading...)</span>}
            </p>
          </div>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Student Directory</CardTitle>
            <CardDescription>Search and filter through all student profiles</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:space-x-4 sm:space-y-0 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input 
                  placeholder="Search students by name..." 
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={handleSearchKeyPress}
                />
              </div>
              <div className="flex space-x-2 sm:space-x-4">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-input rounded-md bg-background text-sm"
                >
                  <option value="">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                  <option value="graduated">Graduated</option>
                  <option value="withdrawn">Withdrawn</option>
                </select>
                <select
                  value={enrollmentScopeFilter}
                  onChange={(e) => setEnrollmentScopeFilter(e.target.value as 'all' | 'enrolled' | 'not_enrolled')}
                  className="px-3 py-2 border border-input rounded-md bg-background text-sm"
                >
                  <option value="all">All Enrollment Scopes</option>
                  <option value="enrolled">Enrolled in any course</option>
                  <option value="not_enrolled">Not enrolled in any course</option>
                </select>
                <select
                  value={courseFilter}
                  onChange={(e) => setCourseFilter(e.target.value)}
                  className="px-3 py-2 border border-input rounded-md bg-background text-sm"
                >
                  <option value="">All Courses</option>
                  {courseOptions.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.name}
                    </option>
                  ))}
                </select>
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
                    setSearchTerm('');
                    setStatusFilter('');
                    setCourseFilter('');
                    setEnrollmentScopeFilter('all');
                    fetchStudents();
                  }}
                  disabled={loading}
                >
                  Clear
                </Button>
              </div>
            </div>

            {/* Students Grid */}
            {loading && students.length === 0 ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Loading students...</span>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="flex items-center justify-center p-8">
                <AlertCircle className="h-8 w-8 text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">No students found</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredStudents.map((student) => (
                  <Card key={student.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="text-center pb-4">
                      <Avatar className="h-20 w-20 mx-auto mb-3">
                        <AvatarImage src={student.avatar || "/placeholder.svg"} alt={student.name} />
                        <AvatarFallback className="text-xl">
                          {student.name.split(" ").map((n) => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg">{student.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">ID: {student.id.toString().padStart(4, "0")}</p>
                        <div className="mt-2">{getStatusBadge(student.status || 'active')}</div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Contact Info */}
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          <span className="truncate">{student.email}</span>
                        </div>
                        {student.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            <span className="truncate">{student.phone}</span>
                          </div>
                        )}
                        {student.address && (
                          <div className="flex items-start gap-2">
                            <MapPin className="h-3 w-3 text-muted-foreground mt-0.5" />
                            <span className="truncate text-xs">{student.address}</span>
                          </div>
                        )}
                      </div>

                      {/* Academic Info */}
                      {student.grade && (
                        <div className="flex items-center gap-2 text-sm">
                          <GraduationCap className="h-3 w-3 text-muted-foreground" />
                          <span>Grade: {student.grade}</span>
                        </div>
                      )}

                      {/* View Details Button */}
                      <Button 
                        onClick={() => handleShowDetailedProfile(student)}
                        className="w-full mt-4"
                        variant="outline"
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-medium tracking-tight text-foreground">{students.length}</div>
              <p className="text-xs text-muted-foreground">Total Students</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-medium tracking-tight text-foreground">
                {filteredStudents.filter((s) => s.status === "active").length}
              </div>
              <p className="text-xs text-muted-foreground">Active Students</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-medium tracking-tight text-foreground">
                {filteredStudents.filter((s) => s.status === "graduated" || s.status === "completed").length}
              </div>
              <p className="text-xs text-muted-foreground">Graduated/Completed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-medium tracking-tight text-foreground">
                {filteredStudents.filter((s) => s.status === "inactive" || s.status === "suspended").length}
              </div>
              <p className="text-xs text-muted-foreground">Inactive/Suspended</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Student Details Panel */}
      <StudentDetailsPanel
        student={selectedStudent}
        progressData={selectedStudent ? progressData.find(p => p.id === selectedStudent.id) || null : null}
        isOpen={isDetailsPanelOpen}
        onClose={handleCloseDetails}
      />
    </>
  )
}

// Loading component for Suspense fallback
function StudentProfilesLoading() {
  return (
          <div className="space-y-6">
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading student profiles...</span>
        </div>
      </div>
  );
}

// Main export with Suspense boundary
export default function StudentProfilesPage() {
  return (
    <Suspense fallback={<StudentProfilesLoading />}>
      <StudentProfilesContent />
    </Suspense>
  );
}
