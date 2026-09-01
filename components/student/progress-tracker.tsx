'use client'

import { useEffect, useState } from 'react';
import { useProgressTracking } from '@/lib/hooks/useProgressTracking';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { BookOpen, CheckCircle, Clock, FileText, TrendingUp } from 'lucide-react';

interface ProgressTrackerProps {
  enrollmentId: number;
  courseId: number;
  onProgressUpdate?: (progress: number) => void;
}

export function ProgressTracker({ enrollmentId, courseId, onProgressUpdate }: ProgressTrackerProps) {
  const { getDetailedProgress } = useProgressTracking();
  const [progressData, setProgressData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProgress();
  }, [enrollmentId, courseId]);

  const loadProgress = async () => {
    try {
      setLoading(true);
      const data = await getDetailedProgress(enrollmentId);
      setProgressData(data);
      if (onProgressUpdate && data?.enrollment) {
        onProgressUpdate(data.enrollment.progress);
      }
    } catch (error) {
      console.error('Failed to load progress:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Loading progress...</div>
        </CardContent>
      </Card>
    );
  }

  if (!progressData) {
    return null;
  }

  const { enrollment, statistics, resourceAccess, sectionProgress } = progressData;

  return (
    <div className="space-y-4">
      {/* Overall Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Course Progress</CardTitle>
          <CardDescription>Your learning journey in this course</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-sm font-bold">{enrollment.progress}%</span>
            </div>
            <Progress value={enrollment.progress} className="h-2" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{statistics.uniqueResourcesAccessed}</div>
              <div className="text-xs text-muted-foreground">Resources Accessed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{statistics.completedResources}</div>
              <div className="text-xs text-muted-foreground">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{statistics.totalTimeSpentFormatted}</div>
              <div className="text-xs text-muted-foreground">Time Spent</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{statistics.completionRate}%</div>
              <div className="text-xs text-muted-foreground">Completion Rate</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Resources */}
      {resourceAccess && resourceAccess.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recently Accessed Resources</CardTitle>
            <CardDescription>Files and materials you've viewed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {resourceAccess.slice(0, 10).map((resource: any) => (
                <div
                  key={resource.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{resource.resource_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {resource.resource_type} • Accessed {resource.access_count} time{resource.access_count !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {resource.completed && (
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Completed
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {new Date(resource.last_accessed_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section Progress */}
      {sectionProgress && sectionProgress.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Section Progress</CardTitle>
            <CardDescription>Your progress through course sections</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sectionProgress.map((section: any) => (
                <div key={section.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">{section.section_name}</span>
                    </div>
                    <span className="text-sm font-bold">{section.progress_percentage}%</span>
                  </div>
                  <Progress value={section.progress_percentage} className="h-2" />
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{section.resources_accessed} / {section.resources_total} resources accessed</span>
                    <span>{section.resources_completed} completed</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

