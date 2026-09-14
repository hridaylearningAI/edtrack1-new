"use client"

import StudentLayout from "@/components/student/student-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useStudentNotifications } from "@/lib/hooks/useStudentNotifications"
import { useUser } from "@/lib/hooks/useUser"
import { 
  Bell, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  RefreshCw,
  Loader2,
  Mail,
  MessageSquare,
  FileText,
  DollarSign,
  Award,
  BookOpen,
  Settings
} from "lucide-react"

// Helper function to format time ago
const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'Just now';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks} week${diffInWeeks > 1 ? 's' : ''} ago`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ago`;
  }

  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears} year${diffInYears > 1 ? 's' : ''} ago`;
}

// Get icon for notification type
const getTypeIcon = (type: string) => {
  switch (type) {
    case 'Payment':
      return DollarSign;
    case 'Achievement':
      return Award;
    case 'Course':
      return BookOpen;
    case 'Reminder':
      return Clock;
    case 'Welcome':
      return MessageSquare;
    case 'System':
      return Settings;
    default:
      return Bell;
  }
}

// Get color for notification type (light and dark mode)
const getTypeColor = (type: string) => {
  switch (type) {
    case 'Payment':
      return 'text-success bg-success-soft border-success-line';
    case 'Achievement':
      return 'text-warning bg-warning-soft border-warning-line';
    case 'Course':
      return 'text-primary bg-primary-soft border-primary-line';
    case 'Reminder':
      return 'text-warning bg-warning-soft border-warning-line';
    case 'Welcome':
      return 'text-primary bg-primary-soft border-primary-line';
    case 'System':
      return 'text-muted-foreground bg-muted border-border';
    default:
      return 'text-muted-foreground bg-muted border-border';
  }
}

export default function NotificationsPage() {
  const { user, isAuthenticated, isLoading } = useUser()
  const { 
    notifications, 
    loading, 
    error, 
    unreadCount, 
    fetchNotifications, 
    markAsRead, 
    markAllAsRead 
  } = useStudentNotifications()

  // Show loading state
  if (isLoading) {
    return (
      <StudentLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Loading...</h2>
            <p className="text-muted-foreground">Please wait while we load your notifications</p>
          </div>
        </div>
      </StudentLayout>
    )
  }

  // Filter notifications
  const unreadNotifications = notifications.filter(n => !n.read_at)
  const readNotifications = notifications.filter(n => n.read_at)

  return (
    <StudentLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-foreground">Notifications</h2>
            <p className="text-muted-foreground mt-2">Stay updated with important information</p>
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              onClick={fetchNotifications}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Refresh
            </Button>
            {unreadCount > 0 && (
              <Button 
                variant="outline"
                onClick={markAllAsRead}
                disabled={loading}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Mark All as Read
              </Button>
            )}
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-foreground">{notifications.length}</div>
                  <p className="text-xs text-muted-foreground">Total Notifications</p>
                </div>
                <Bell className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-foreground">{unreadCount}</div>
                  <p className="text-xs text-muted-foreground">Unread</p>
                </div>
                <AlertCircle className="h-8 w-8 text-warning" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-foreground">{readNotifications.length}</div>
                  <p className="text-xs text-muted-foreground">Read</p>
                </div>
                <CheckCircle className="h-8 w-8 text-success" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        {error ? (
          <Card>
            <CardContent className="p-8 text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Error Loading Notifications</h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button variant="outline" onClick={fetchNotifications}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            </CardContent>
          </Card>
        ) : loading && notifications.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Loading notifications...</p>
            </CardContent>
          </Card>
        ) : notifications.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Notifications</h3>
              <p className="text-muted-foreground">You're all caught up! No new notifications at this time.</p>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="all" className="space-y-6">
            <TabsList>
              <TabsTrigger value="all">
                All ({notifications.length})
              </TabsTrigger>
              <TabsTrigger value="unread">
                Unread ({unreadCount})
              </TabsTrigger>
              <TabsTrigger value="read">
                Read ({readNotifications.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              {notifications.map((notification) => {
                const TypeIcon = getTypeIcon(notification.type)
                const isUnread = !notification.read_at
                
                return (
                  <Card 
                    key={notification.id}
                    className={`cursor-pointer hover:shadow-md transition-shadow border ${
                      isUnread
                        ? 'bg-primary-soft border-primary-line'
                        : ''
                    }`}
                    onClick={() => isUnread && markAsRead(notification.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-4">
                        <div className={`p-3 rounded-lg border ${getTypeColor(notification.type)}`}>
                          <TypeIcon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1">
                              <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                                {notification.title}
                                {isUnread && (
                                  <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0" aria-hidden></span>
                                )}
                              </h3>
                              <p className="text-sm text-muted-foreground mt-1">
                                {notification.message}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Badge variant="outline" className="text-xs border-border bg-muted/50 text-foreground">
                                {notification.type}
                              </Badge>
                              {notification.priority === 'High' && (
                                <Badge variant="destructive" className="text-xs">
                                  High
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-3">
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatTimeAgo(notification.created_at)}
                              </span>
                              {notification.delivery_method && (
                                <span className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {notification.delivery_method}
                                </span>
                              )}
                            </div>
                            {isUnread && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="text-xs"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  markAsRead(notification.id)
                                }}
                              >
                                Mark as read
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </TabsContent>

            <TabsContent value="unread" className="space-y-4">
              {unreadNotifications.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">All Caught Up!</h3>
                    <p className="text-muted-foreground">You have no unread notifications.</p>
                  </CardContent>
                </Card>
              ) : (
                unreadNotifications.map((notification) => {
                  const TypeIcon = getTypeIcon(notification.type)
                  
                  return (
                    <Card 
                      key={notification.id}
                      className="cursor-pointer hover:shadow-md transition-shadow bg-primary-soft border border-primary-line"
                      onClick={() => markAsRead(notification.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-4">
                          <div className={`p-3 rounded-lg border ${getTypeColor(notification.type)}`}>
                            <TypeIcon className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex-1">
                                <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                                  {notification.title}
                                  <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0" aria-hidden></span>
                                </h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {notification.message}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <Badge variant="outline" className="text-xs border-border bg-muted/50 text-foreground">
                                  {notification.type}
                                </Badge>
                                {notification.priority === 'High' && (
                                  <Badge variant="destructive" className="text-xs">
                                    High
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center justify-between mt-3">
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatTimeAgo(notification.created_at)}
                                </span>
                                {notification.delivery_method && (
                                  <span className="flex items-center gap-1">
                                    <Mail className="h-3 w-3" />
                                    {notification.delivery_method}
                                  </span>
                                )}
                              </div>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="text-xs"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  markAsRead(notification.id)
                                }}
                              >
                                Mark as read
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })
              )}
            </TabsContent>

            <TabsContent value="read" className="space-y-4">
              {readNotifications.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No Read Notifications</h3>
                    <p className="text-muted-foreground">You haven't read any notifications yet.</p>
                  </CardContent>
                </Card>
              ) : (
                readNotifications.map((notification) => {
                  const TypeIcon = getTypeIcon(notification.type)
                  
                  return (
                    <Card 
                      key={notification.id}
                      className="opacity-90"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-4">
                          <div className={`p-3 rounded-lg border ${getTypeColor(notification.type)}`}>
                            <TypeIcon className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex-1">
                                <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                                  {notification.title}
                                  <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                                </h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {notification.message}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <Badge variant="outline" className="text-xs border-border bg-muted/50 text-foreground">
                                  {notification.type}
                                </Badge>
                                {notification.priority === 'High' && (
                                  <Badge variant="destructive" className="text-xs">
                                    High
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-3">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatTimeAgo(notification.created_at)}
                              </span>
                              {notification.read_at && (
                                <span className="flex items-center gap-1">
                                  <CheckCircle className="h-3 w-3" />
                                  Read {formatTimeAgo(notification.read_at)}
                                </span>
                              )}
                              {notification.delivery_method && (
                                <span className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {notification.delivery_method}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </StudentLayout>
  )
}
