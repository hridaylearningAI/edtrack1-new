# Course Progress Tracking System

This document explains how to implement and use the progress tracking system for monitoring student activity and progress in courses.

## Overview

The progress tracking system allows you to:
- Track which files/resources students have accessed
- Monitor where students are in a course
- Calculate detailed progress statistics
- View progress data for both students and admins

## Database Schema

Three main tables are used for progress tracking:

### 1. `course_resource_access`
Tracks individual resource/file access by students:
- Records each time a student accesses a resource
- Tracks time spent on resources
- Marks resources as completed
- Stores access counts and timestamps

### 2. `course_section_progress`
Tracks progress through course sections/modules:
- Monitors which sections students have started
- Tracks completion percentage per section
- Counts resources accessed/completed per section

### 3. `course_activity_log`
Logs all course-related activities:
- Resource access
- Assignment submissions
- Quiz attempts
- Forum posts
- Other activities

## Setup

### 1. Run Database Migration

```sql
-- Run the migration file
\i docs/database/create_course_progress_tracking.sql
```

### 2. Install Dependencies

The system uses existing dependencies. No additional packages are required.

## API Endpoints

### Track Resource Access

**POST** `/api/progress/track-resource`

Track when a student accesses a course resource.

**Request Body:**
```json
{
  "enrollmentId": 123,
  "courseId": 45,
  "resourceId": 789,
  "resourceName": "Introduction to React",
  "resourceType": "file",
  "resourceUrl": "https://moodle.example.com/mod/resource/view.php?id=789",
  "timeSpentSeconds": 120,
  "markCompleted": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "enrollment_id": 123,
    "resource_id": 789,
    "access_count": 1,
    "time_spent_seconds": 120,
    "completed": false,
    "last_accessed_at": "2024-01-15T10:30:00Z"
  }
}
```

### Get Detailed Progress

**GET** `/api/progress/get-detailed?enrollmentId=123`

Get comprehensive progress data for an enrollment.

**Query Parameters:**
- `enrollmentId` (optional): Specific enrollment ID
- `courseId` (optional): Get progress for all enrollments in a course
- `studentId` (optional): For admin access to specific student's progress

**Response:**
```json
{
  "success": true,
  "data": {
    "enrollment": {
      "id": 123,
      "student_id": 456,
      "course_id": 45,
      "progress": 65,
      "status": "active"
    },
    "statistics": {
      "totalResources": 50,
      "completedResources": 32,
      "totalTimeSpentSeconds": 7200,
      "totalTimeSpentFormatted": "2h 0m 0s",
      "uniqueResourcesAccessed": 32,
      "completionRate": 64
    },
    "resourceAccess": [...],
    "sectionProgress": [...],
    "recentActivity": [...]
  }
}
```

## Frontend Integration

### Using the Hook

```typescript
import { useProgressTracking } from '@/lib/hooks/useProgressTracking';

function CourseResourceViewer({ enrollmentId, courseId, resource }) {
  const { trackResourceAccess, trackTimeSpent } = useProgressTracking();
  const [timeSpent, setTimeSpent] = useState(0);

  useEffect(() => {
    // Track initial access
    trackResourceAccess({
      enrollmentId,
      courseId,
      resourceId: resource.id,
      resourceName: resource.name,
      resourceType: resource.type,
      resourceUrl: resource.url,
    });

    // Track time spent (updates every 30 seconds)
    const cleanup = trackTimeSpent({
      enrollmentId,
      courseId,
      resourceId: resource.id,
      resourceName: resource.name,
      resourceType: resource.type,
      resourceUrl: resource.url,
    }, 30);

    return cleanup;
  }, [resource.id]);

  const handleMarkComplete = async () => {
    await trackResourceAccess({
      enrollmentId,
      courseId,
      resourceId: resource.id,
      resourceName: resource.name,
      resourceType: resource.type,
      resourceUrl: resource.url,
      markCompleted: true,
    });
  };

  return (
    <div>
      {/* Resource content */}
      <button onClick={handleMarkComplete}>Mark as Complete</button>
    </div>
  );
}
```

### Displaying Progress

```typescript
import { ProgressTracker } from '@/components/student/progress-tracker';

function CoursePage({ enrollmentId, courseId }) {
  return (
    <div>
      <ProgressTracker 
        enrollmentId={enrollmentId}
        courseId={courseId}
        onProgressUpdate={(progress) => {
          console.log('Progress updated:', progress);
        }}
      />
    </div>
  );
}
```

## Integration with Moodle

When students access resources through Moodle, you can track them by:

1. **Intercepting resource clicks** in the Moodle iframe or SSO redirect
2. **Using Moodle webhooks** (if available) to notify your system
3. **Periodic sync** from Moodle completion data

### Example: Track Moodle Resource Access

```typescript
// When opening a Moodle resource
async function openMoodleResource(resourceUrl, enrollmentId, courseId) {
  // Open Moodle in new tab
  const moodleWindow = window.open(resourceUrl, '_blank');
  
  // Track the access
  await trackResourceAccess({
    enrollmentId,
    courseId,
    resourceId: extractResourceId(resourceUrl),
    resourceName: 'Moodle Resource',
    resourceType: 'moodle_resource',
    resourceUrl,
  });

  // Monitor if window is closed (to track completion)
  const checkInterval = setInterval(() => {
    if (moodleWindow.closed) {
      clearInterval(checkInterval);
      // Mark as completed if user spent significant time
      trackResourceAccess({
        enrollmentId,
        courseId,
        resourceId: extractResourceId(resourceUrl),
        resourceName: 'Moodle Resource',
        resourceType: 'moodle_resource',
        resourceUrl,
        markCompleted: true,
      });
    }
  }, 1000);
}
```

## Admin Views

Admins can view progress for all students:

```typescript
// Get progress for a specific student in a course
const progress = await getDetailedProgress(
  undefined, // enrollmentId
  courseId,
  studentId
);

// Get progress for all students in a course
const allProgress = await getDetailedProgress(
  undefined,
  courseId
);
```

## Best Practices

1. **Track on Access**: Track resource access immediately when a student opens a resource
2. **Track Time Periodically**: Update time spent every 30-60 seconds while resource is open
3. **Mark Completion**: Allow students to manually mark resources as complete, or auto-mark based on time spent
4. **Sync with Moodle**: Periodically sync progress from Moodle's completion tracking
5. **Handle Errors Gracefully**: Progress tracking should not block the user experience

## Security

- Students can only track/access their own progress
- Admins can view all student progress
- All API endpoints require authentication
- Row Level Security (RLS) policies enforce data access rules

## Performance Considerations

- Resource access tracking is asynchronous and non-blocking
- Progress calculations are cached in the enrollment table
- Use pagination for large resource lists
- Indexes are created for optimal query performance

