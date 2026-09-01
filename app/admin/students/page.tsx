'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Search, Plus, MoreHorizontal, Mail, Phone, Eye, Edit, Trash2, AlertCircle, Loader2, RefreshCw, Clock } from "lucide-react"
import { useStudents } from "@/lib/hooks/useStudents"
import { useAdminProgress } from "@/lib/hooks/useAdminProgress"
import { AddStudentDialog, EditStudentDialog } from "@/components/admin/student-dialog"
import { StudentDetailsPanel } from "@/components/admin/student-details-panel"
import { Student, StudentCreate, StudentUpdate } from "@/lib/api"
import { toast } from "sonner"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useMemo } from "react"

export default function StudentsPage() {
  const {
    students,
    loading,
    error,
    totalCount,
    currentPage,
    totalPages,
    fetchStudents,
    createStudent,
    updateStudent,
    deleteStudent,
    searchStudents,
    clearError,
  } = useStudents();

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
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedStudentProgress, setSelectedStudentProgress] = useState<any>(null);
  const [isDetailsPanelOpen, setIsDetailsPanelOpen] = useState(false);

  // Merge student data with progress data
  const studentsWithProgress = useMemo(() => {
    return students.map(student => {
      const progress = progressData.find(p => p.id === student.id);
      return {
        ...student,
        progressData: progress || null
      };
    });
  }, [students, progressData]);

  // Handle opening student details
  const handleViewDetails = (student: Student) => {
    setSelectedStudent(student);
    const progress = progressData.find(p => p.id === student.id);
    setSelectedStudentProgress(progress || null);
    setIsDetailsPanelOpen(true);
  };

  // Handle closing student details
  const handleCloseDetails = () => {
    setIsDetailsPanelOpen(false);
    setSelectedStudent(null);
  };

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

  // Handle adding a new student
  const handleStudentAdded = async (studentData: StudentCreate) => {
    try {
      const newStudent = await createStudent(studentData);
      if (newStudent) {
        toast.success('Student added successfully!');
      }
    } catch (error) {
      toast.error('Failed to add student');
    }
  };

  // Handle updating a student
  const handleStudentUpdated = async (studentData: StudentUpdate & { id: number }) => {
    try {
      const { id, ...updateData } = studentData;
      const updatedStudent = await updateStudent(id, updateData);
      if (updatedStudent) {
        toast.success('Student updated successfully!');
      }
    } catch (error) {
      toast.error('Failed to update student');
    }
  };

  // Handle deleting a student
  const handleStudentDeleted = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this student? This action cannot be undone.')) {
      try {
        setIsDeleting(id);
        const success = await deleteStudent(id);
        if (success) {
          toast.success('Student deleted successfully!');
        }
      } catch (error) {
        toast.error('Failed to delete student');
      } finally {
        setIsDeleting(null);
      }
    }
  };

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
        return (
          <Badge variant="default" className="bg-green-600 text-white">
            Active
          </Badge>
        )
      case "completed":
        return (
          <Badge variant="default" className="bg-blue-600 text-white">
            Completed
          </Badge>
        )
      case "inactive":
        return <Badge variant="secondary">Inactive</Badge>
      case "suspended":
        return <Badge variant="destructive">Suspended</Badge>
      case "graduated":
        return <Badge variant="default" className="bg-purple-600 text-white">Graduated</Badge>
      case "withdrawn":
        return <Badge variant="outline">Withdrawn</Badge>
      default:
        return <Badge variant="outline">{status || 'Unknown'}</Badge>
    }
  };

  const getCompletionColor = (percentage: number) => {
    if (percentage >= 80) return "bg-green-500"
    if (percentage >= 50) return "bg-yellow-500"
    return "bg-red-500"
  };

  // Calculate completion percentage from real-time progress data
  const getCompletionPercentage = (student: Student) => {
    const progress = progressData.find(p => p.id === student.id);
    if (progress) {
      return progress.overallProgress;
    }
    // Fallback to status-based calculation
    if (student.status === 'graduated' || student.status === 'completed') return 100;
    if (student.status === 'withdrawn') return 0;
    return 0; // Default to 0 if no progress data
  };

  return (
    <>
          <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Students</h2>
              {autoRefresh && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  Live
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-1 sm:mt-2">
              Manage and view all student information with real-time progress tracking
              {loading && <span className="ml-2 text-blue-600">(Loading...)</span>}
            </p>
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
            <AddStudentDialog onStudentAdded={handleStudentAdded} />
          </div>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Student Directory</CardTitle>
            <CardDescription>Search and filter through all enrolled students</CardDescription>
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
                    fetchStudents();
                  }}
                  disabled={loading}
                >
                  Clear
                </Button>
              </div>
            </div>

            {/* Students Table */}
            <div className="rounded-md border overflow-x-auto">
              {loading && students.length === 0 ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Loading students...</span>
                </div>
              ) : students.length === 0 ? (
                <div className="flex items-center justify-center p-8">
                  <AlertCircle className="h-8 w-8 text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">No students found</span>
                </div>
              ) : (
                <Table className="min-w-[800px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">Student</TableHead>
                      <TableHead className="min-w-[200px]">Contact</TableHead>
                      <TableHead className="min-w-[150px]">Last Accessed</TableHead>
                      <TableHead className="min-w-[120px]">Enrollment Date</TableHead>
                      <TableHead className="min-w-[120px]">Progress</TableHead>
                      <TableHead className="min-w-[100px]">Status</TableHead>
                      <TableHead className="text-right min-w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentsWithProgress.map((student) => {
                      const completionPercentage = getCompletionPercentage(student);
                      const progress = student.progressData;
                      return (
                        <TableRow key={student.id}>
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <Avatar className="h-10 w-10 shrink-0">
                                <AvatarImage src={student.avatar || "/placeholder.svg"} alt={student.name} />
                                <AvatarFallback>
                                  {student.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <div className="font-medium text-foreground truncate">{student.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  ID: {student.id.toString().padStart(4, "0")}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center text-sm">
                                <Mail className="mr-2 h-3 w-3 text-muted-foreground shrink-0" />
                                <span className="truncate">{student.email}</span>
                              </div>
                              {student.phone && (
                                <div className="flex items-center text-sm">
                                  <Phone className="mr-2 h-3 w-3 text-muted-foreground shrink-0" />
                                  <span className="truncate">{student.phone}</span>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm whitespace-nowrap">
                              {progress?.lastActivity 
                                ? new Date(progress.lastActivity).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })
                                : student.updated_at 
                                ? new Date(student.updated_at).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })
                                : 'N/A'
                              }
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm whitespace-nowrap">
                              {student.enrollment_date 
                                ? new Date(student.enrollment_date).toLocaleDateString()
                                : 'N/A'
                              }
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-2 min-w-[100px]">
                              <div className="flex items-center justify-between text-sm">
                                <span>{completionPercentage}%</span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${getCompletionColor(completionPercentage)}`}
                                  style={{ width: `${completionPercentage}%` }}
                                />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(student.status || 'active')}</TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => handleViewDetails(student)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <EditStudentDialog 
                                    student={student} 
                                    onStudentUpdated={handleStudentUpdated}
                                    trigger={
                                      <div className="flex items-center">
                                        <Edit className="mr-2 h-4 w-4" />
                                        Edit Student
                                      </div>
                                    }
                                  />
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="text-destructive"
                                  onClick={() => handleStudentDeleted(student.id)}
                                  disabled={isDeleting === student.id}
                                >
                                  {isDeleting === student.id ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="mr-2 h-4 w-4" />
                                  )}
                                  {isDeleting === student.id ? 'Deleting...' : 'Delete Student'}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-foreground">{totalCount}</div>
              <p className="text-xs text-muted-foreground">Total Students</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-foreground">
                {students.filter((s) => s.status === "active").length}
              </div>
              <p className="text-xs text-muted-foreground">Active Students</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-foreground">
                {students.filter((s) => s.status === "graduated" || s.status === "completed").length}
              </div>
              <p className="text-xs text-muted-foreground">Graduated/Completed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-foreground">
                {students.length > 0 
                  ? Math.round(students.reduce((acc, s) => acc + getCompletionPercentage(s), 0) / students.length)
                  : 0}%
              </div>
              <p className="text-xs text-muted-foreground">Average Progress</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Student Details Panel */}
      <StudentDetailsPanel
        student={selectedStudent}
        progressData={selectedStudentProgress}
        isOpen={isDetailsPanelOpen}
        onClose={handleCloseDetails}
      />
    </>
  )
}
