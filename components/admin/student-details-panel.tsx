'use client';

import { useState, useEffect } from 'react';
import { X, Mail, Phone, MapPin, Calendar, GraduationCap, User, Clock, ExternalLink, BookOpen, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Student } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface StudentDetailsPanelProps {
  student: Student | null;
  progressData?: any | null;
  isOpen: boolean;
  onClose: () => void;
}

export function StudentDetailsPanel({ student, progressData, isOpen, onClose }: StudentDetailsPanelProps) {
  const [isVisible, setIsVisible] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!student || !isVisible) return null;

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

  const handleMoreDetails = () => {
    onClose();
    router.push(`/admin/student-profiles?student=${student.id}`);
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />
      
      {/* Side Panel */}
      <div 
        className={`fixed right-0 top-0 h-full w-full max-w-md bg-background border-l shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Student Details</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto h-[calc(100vh-80px)]">
          {/* Student Avatar and Basic Info */}
          <div className="text-center space-y-4">
            <Avatar className="h-24 w-24 mx-auto">
              <AvatarImage src={student.avatar || "/placeholder.svg"} alt={student.name} />
              <AvatarFallback className="text-2xl">
                {student.name.split(" ").map((n) => n[0]).join("")}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-xl font-semibold">{student.name}</h3>
              <p className="text-muted-foreground">
                {student.student_number || `ID: ${student.id.toString().padStart(4, "0")}`}
              </p>
              <div className="mt-2">{getStatusBadge(student.status || 'active')}</div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h4 className="font-semibold text-lg flex items-center gap-2">
              <User className="h-5 w-5" />
              Contact Information
            </h4>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{student.email}</span>
              </div>
              {student.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{student.phone}</span>
                </div>
              )}
              {student.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span className="text-sm">{student.address}</span>
                </div>
              )}
            </div>
          </div>

          {/* Academic Information */}
          <div className="space-y-4">
            <h4 className="font-semibold text-lg flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Academic Information
            </h4>
            <div className="space-y-3">
              {student.grade && (
                <div className="flex items-center gap-3">
                  <GraduationCap className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Grade: {student.grade}</span>
                </div>
              )}
              {student.date_of_birth && (
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Date of Birth: {new Date(student.date_of_birth).toLocaleDateString()}
                  </span>
                </div>
              )}
              {student.enrollment_date && (
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Enrollment Date: {new Date(student.enrollment_date).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Progress Overview */}
          {progressData && (
            <div className="space-y-4">
              <h4 className="font-semibold text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Progress Overview
              </h4>
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-2xl font-medium tracking-tight text-foreground">{progressData.overallProgress}%</div>
                      <p className="text-xs text-muted-foreground">Overall Progress</p>
                    </div>
                    <div>
                      <div className="text-2xl font-medium tracking-tight text-foreground">
                        {progressData.unitsCompleted}/{progressData.totalUnits}
                      </div>
                      <p className="text-xs text-muted-foreground">Units Completed</p>
                    </div>
                    <div>
                      <div className="text-2xl font-medium tracking-tight text-foreground">{progressData.timeSpent}h</div>
                      <p className="text-xs text-muted-foreground">Time Spent</p>
                    </div>
                    <div>
                      <div className="text-2xl font-medium tracking-tight text-foreground">
                        {progressData.status}
                      </div>
                      <p className="text-xs text-muted-foreground">Status</p>
                    </div>
                  </div>
                  <Progress value={progressData.overallProgress} className="h-2" />
                </CardContent>
              </Card>
            </div>
          )}

          {/* Enrolled Courses */}
          {progressData && progressData.enrollments && progressData.enrollments.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-semibold text-lg flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Enrolled Courses ({progressData.enrollments.length})
              </h4>
              <div className="space-y-3">
                {progressData.enrollments.map((enrollment: any) => (
                  <Card key={enrollment.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h5 className="font-semibold text-sm">{enrollment.courseName}</h5>
                          <p className="text-xs text-muted-foreground mt-1">
                            Enrolled: {new Date(enrollment.enrollmentDate).toLocaleDateString()}
                          </p>
                          {enrollment.completionDate && (
                            <p className="text-xs text-muted-foreground">
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
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Last updated: {new Date(enrollment.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Additional Details */}
          <div className="space-y-4">
            <h4 className="font-semibold text-lg">Additional Details</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Status:</span>
                <div className="mt-1">{getStatusBadge(student.status || 'active')}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Student ID:</span>
                <div className="mt-1 font-mono">{student.id}</div>
              </div>
            </div>
          </div>

          {/* More Details Button */}
          <div className="pt-4 border-t">
            <Button 
              onClick={handleMoreDetails}
              className="w-full bg-primary hover:bg-primary/90"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              More Details
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
