# Progress Tracking Integration Example

This document shows how to integrate progress tracking into the student course viewing experience.

## Example: Track Resource Access in Current Units Page

Here's how to modify the current-units page to track when students access Moodle resources:

```typescript
// In app/student/current-units/page.tsx

import { useProgressTracking } from '@/lib/hooks/useProgressTracking';
import { ProgressTracker } from '@/components/student/progress-tracker';

export default function CurrentUnitsPage() {
  const { trackResourceAccess } = useProgressTracking();
  // ... existing code ...

  // Modify the handleOpenMoodle function to track access
  const handleOpenMoodle = async (enrollment: any, resource?: any) => {
    try {
      setOpeningMoodle(enrollment.id);
      
      // Get SSO URL (existing code)
      const ssoResponse = await fetch(`/api/moodle/sso?courseId=${enrollment.course_id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      const ssoData = await ssoResponse.json();
      const moodleWindow = window.open(ssoData.data.ssoUrl, '_blank');

      // Track resource access if resource info is available
      if (resource) {
        await trackResourceAccess({
          enrollmentId: enrollment.id,
          courseId: enrollment.course_id,
          resourceId: resource.id,
          resourceName: resource.name,
          resourceType: resource.type || 'moodle_resource',
          resourceUrl: resource.url || ssoData.data.ssoUrl,
        });

        // Track time spent while window is open
        const startTime = Date.now();
        const checkInterval = setInterval(() => {
          if (moodleWindow.closed) {
            clearInterval(checkInterval);
            const timeSpent = Math.floor((Date.now() - startTime) / 1000);
            
            // Update with time spent and mark as completed if significant time
            trackResourceAccess({
              enrollmentId: enrollment.id,
              courseId: enrollment.course_id,
              resourceId: resource.id,
              resourceName: resource.name,
              resourceType: resource.type || 'moodle_resource',
              resourceUrl: resource.url || ssoData.data.ssoUrl,
              timeSpentSeconds: timeSpent,
              markCompleted: timeSpent > 60, // Mark complete if spent more than 1 minute
            });
          }
        }, 5000); // Check every 5 seconds
      }
    } catch (error) {
      console.error('Failed to open Moodle:', error);
    } finally {
      setOpeningMoodle(null);
    }
  };

  // Add ProgressTracker component to the course details view
  return (
    <div>
      {/* Existing course content */}
      
      {/* Add progress tracker tab */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
        </TabsList>
        
        <TabsContent value="progress">
          <ProgressTracker 
            enrollmentId={selectedEnrollment?.id}
            courseId={selectedEnrollment?.course_id}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

## Example: Track Resource Access from Resources Tab

```typescript
// When displaying resources in the resources tab
<TabsContent value="resources">
  {resources.map((resource: any) => (
    <div key={resource.id} className="p-4 border rounded-lg">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold">{resource.name}</h4>
          <p className="text-sm text-muted-foreground">{resource.type}</p>
        </div>
        <Button
          onClick={async () => {
            // Track access before opening
            await trackResourceAccess({
              enrollmentId: enrollment.id,
              courseId: enrollment.course_id,
              resourceId: resource.id,
              resourceName: resource.name,
              resourceType: resource.type,
              resourceUrl: resource.url,
            });

            // Open resource
            window.open(resource.url, '_blank');
          }}
        >
          Open Resource
        </Button>
      </div>
    </div>
  ))}
</TabsContent>
```

## Example: Admin Progress View

Create a new admin page to view student progress:

```typescript
// app/admin/student-progress/page.tsx

'use client'

import { useState, useEffect } from 'react';
import { useProgressTracking } from '@/lib/hooks/useProgressTracking';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

export default function StudentProgressPage() {
  const { getDetailedProgress } = useProgressTracking();
  const [progressData, setProgressData] = useState<any>(null);
  const [courseId, setCourseId] = useState<number | null>(null);
  const [studentId, setStudentId] = useState<number | null>(null);

  useEffect(() => {
    if (courseId) {
      loadProgress();
    }
  }, [courseId, studentId]);

  const loadProgress = async () => {
    try {
      const data = await getDetailedProgress(undefined, courseId || undefined, studentId || undefined);
      setProgressData(data);
    } catch (error) {
      console.error('Failed to load progress:', error);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Student Progress Tracking</h1>
      
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Course and student selectors */}
        </CardContent>
      </Card>

      {/* Progress Display */}
      {progressData && (
        <div className="space-y-4">
          {Array.isArray(progressData) ? (
            progressData.map((data: any) => (
              <Card key={data.enrollment.id}>
                <CardHeader>
                  <CardTitle>Student ID: {data.enrollment.student_id}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Progress value={data.enrollment.progress} />
                  <div className="mt-4">
                    <p>Resources Accessed: {data.statistics.uniqueResourcesAccessed}</p>
                    <p>Resources Completed: {data.statistics.completedResources}</p>
                    <p>Time Spent: {data.statistics.totalTimeSpentFormatted}</p>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent>
                <Progress value={progressData.enrollment.progress} />
                {/* Display detailed progress */}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
```

## Next Steps

1. **Run the database migration** to create the tracking tables
2. **Integrate tracking** into resource access points
3. **Add ProgressTracker component** to student course pages
4. **Create admin views** for monitoring student progress
5. **Set up periodic sync** with Moodle completion data

