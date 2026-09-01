"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Search,
  Bell,
  Send,
  Settings,
  Mail,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  Clock,
  MoreHorizontal,
  Eye,
  Trash2,
  Loader2,
} from "lucide-react"
import { useNotifications } from "@/lib/hooks/useNotifications"
import { useStudents } from "@/lib/hooks/useStudents"
import { apiClient } from "@/lib/api"
import { useAuth } from "@clerk/nextjs"
import { useEffect } from "react"
import EmailCampaignsPanel from "../email-campaign/campaigns-panel"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

// Default notification settings categories
const defaultNotificationCategories = [
  {
    category: "Course Updates",
    description: "Notifications about course progress and updates",
  },
  {
    category: "Payment Reminders",
    description: "Reminders for overdue payments and billing",
  },
  {
    category: "Assignment Deadlines",
    description: "Reminders for upcoming assignment deadlines",
  },
  {
    category: "System Announcements",
    description: "Important system updates and announcements",
  },
  {
    category: "Marketing Communications",
    description: "Promotional content and course recommendations",
  },
]

const getStatusBadge = (status: string) => {
  switch (status) {
    case "Sent":
      return (
        <Badge variant="default" className="bg-chart-1 text-white">
          <Send className="mr-1 h-3 w-3" />
          Sent
        </Badge>
      )
    case "Delivered":
      return (
        <Badge variant="default" className="bg-chart-3 text-white">
          <CheckCircle className="mr-1 h-3 w-3" />
          Delivered
        </Badge>
      )
    case "Pending":
      return (
        <Badge variant="secondary">
          <Clock className="mr-1 h-3 w-3" />
          Pending
        </Badge>
      )
    case "Failed":
      return (
        <Badge variant="destructive">
          <AlertCircle className="mr-1 h-3 w-3" />
          Failed
        </Badge>
      )
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "High":
      return "text-chart-2"
    case "Medium":
      return "text-chart-4"
    case "Low":
      return "text-chart-1"
    default:
      return "text-muted-foreground"
  }
}

const getTypeIcon = (type: string) => {
  switch (type) {
    case "Payment":
      return <AlertCircle className="h-4 w-4 text-chart-2" />
    case "Achievement":
      return <CheckCircle className="h-4 w-4 text-chart-3" />
    case "Reminder":
      return <Clock className="h-4 w-4 text-chart-4" />
    case "Welcome":
      return <MessageSquare className="h-4 w-4 text-chart-1" />
    default:
      return <Bell className="h-4 w-4 text-muted-foreground" />
  }
}

export default function NotificationsPage() {
  const { getToken } = useAuth()
  const {
    notifications,
    settings,
    loading,
    error,
    totalNotifications,
    sentNotifications,
    pendingNotifications,
    deliveryRate,
    createNotification,
    updateNotification,
    deleteNotification,
    sendNotification,
    saveSettings,
    refreshData,
  } = useNotifications()

  const { students } = useStudents()
  const [searchTerm, setSearchTerm] = useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false)
  const [selectedNotification, setSelectedNotification] = useState<any>(null)
  const [readStatus, setReadStatus] = useState<any>(null)
  const [loadingReadStatus, setLoadingReadStatus] = useState(false)

  // Set token getter for API client
  useEffect(() => {
    apiClient.setTokenGetter(async () => {
      try {
        if (getToken) {
          const token = await getToken()
          if (token) return token
        }
        const stored = sessionStorage.getItem('clerk_auth_token')
        return stored
      } catch (error) {
        console.warn('Error getting token:', error)
        return sessionStorage.getItem('clerk_auth_token')
      }
    })
  }, [getToken])
  const [newNotification, setNewNotification] = useState({
    title: "",
    message: "",
    type: "General" as const,
    priority: "Medium" as const,
    recipient_id: undefined as number | undefined,
    delivery_method: "Email" as const,
  })

  // Filter notifications based on search
  const filteredNotifications = notifications.filter((notification) =>
    searchTerm === "" ||
    notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    notification.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (notification.recipient_name && notification.recipient_name.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const handleCreateNotification = async () => {
    if (!newNotification.title || !newNotification.message) {
      return
    }

    const recipient = students.find(s => s.id === newNotification.recipient_id)
    await createNotification({
      ...newNotification,
      recipient_name: recipient?.name,
      recipient_email: recipient?.email,
    })

    setIsCreateDialogOpen(false)
    setNewNotification({
      title: "",
      message: "",
      type: "General",
      priority: "Medium",
      recipient_id: undefined,
      delivery_method: "Email",
    })
  }

  const handleDeleteNotification = async (id: number) => {
    if (confirm("Are you sure you want to delete this notification?")) {
      await deleteNotification(id)
    }
  }

  const handleSendNotification = async (id: number) => {
    await sendNotification(id)
  }

  const getSettingForCategory = (category: string) => {
    return settings.find(s => s.category === category)
  }

  const handleToggleSetting = async (category: string, field: 'email_enabled' | 'push_enabled' | 'sms_enabled') => {
    const existing = getSettingForCategory(category)
    const currentValue = existing ? existing[field] : (field === 'sms_enabled' ? false : true)
    
    // For now, we'll use a default user_id of 1 (admin)
    // In a real app, you'd get this from the current user context
    await saveSettings({
      user_id: 1, // TODO: Get from auth context
      category,
      email_enabled: field === 'email_enabled' ? !currentValue : (existing?.email_enabled ?? true),
      push_enabled: field === 'push_enabled' ? !currentValue : (existing?.push_enabled ?? true),
      sms_enabled: field === 'sms_enabled' ? !currentValue : (existing?.sms_enabled ?? false),
    })
  }

  return (
    <>
          <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-foreground">Communications</h2>
            <p className="text-muted-foreground mt-2">Notifications, email campaigns, and delivery settings</p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => setIsSettingsDialogOpen(true)}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
            <Button className="bg-primary hover:bg-primary/90" onClick={() => setIsCreateDialogOpen(true)}>
              <Send className="mr-2 h-4 w-4" />
              Send Notification
            </Button>
          </div>
        </div>

        {/* Notification Statistics */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-foreground">{totalNotifications}</div>
                  <p className="text-xs text-muted-foreground">Total Sent</p>
                </div>
                <Bell className="h-8 w-8 text-chart-1" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-foreground">{sentNotifications}</div>
                  <p className="text-xs text-muted-foreground">Delivered</p>
                </div>
                <CheckCircle className="h-8 w-8 text-chart-3" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-foreground">{pendingNotifications}</div>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
                <Clock className="h-8 w-8 text-chart-4" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-foreground">{deliveryRate}%</div>
                  <p className="text-xs text-muted-foreground">Delivery Rate</p>
                </div>
                <Send className="h-8 w-8 text-chart-2" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Notifications Management */}
        <Tabs defaultValue="notifications" className="space-y-6">
          <TabsList>
            <TabsTrigger value="notifications">All Notifications</TabsTrigger>
            <TabsTrigger value="campaigns">Email campaigns</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Notification History</CardTitle>
                <CardDescription>View and manage all sent notifications</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input 
                      placeholder="Search notifications..." 
                      className="pl-10"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Button variant="outline">Filter</Button>
                  <Button variant="outline">Export</Button>
                </div>

                {loading && notifications.length === 0 ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <span className="ml-2">Loading notifications...</span>
                  </div>
                ) : filteredNotifications.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    {searchTerm ? "No notifications found matching your search" : "No notifications yet"}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredNotifications.map((notification) => (
                      <Card key={notification.id} className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-4">
                            <div className="mt-1">{getTypeIcon(notification.type)}</div>
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <h3 className="font-semibold">{notification.title}</h3>
                                <Badge variant="outline" className="text-xs">
                                  {notification.type}
                                </Badge>
                                <span className={`text-xs font-medium ${getPriorityColor(notification.priority)}`}>
                                  {notification.priority} Priority
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">{notification.message}</p>
                              <div className="flex items-center space-x-4">
                                {notification.recipient_name && (
                                  <div className="flex items-center space-x-2">
                                    <Avatar className="h-6 w-6">
                                      <AvatarImage
                                        src="/placeholder.svg"
                                        alt={notification.recipient_name}
                                      />
                                      <AvatarFallback className="text-xs">
                                        {notification.recipient_name
                                          .split(" ")
                                          .map((n) => n[0])
                                          .join("")}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-sm font-medium">{notification.recipient_name}</span>
                                  </div>
                                )}
                                <div className="text-xs text-muted-foreground">
                                  Created: {new Date(notification.created_at).toLocaleString()}
                                </div>
                                {notification.sent_at && (
                                  <div className="text-xs text-muted-foreground">
                                    Sent: {new Date(notification.sent_at).toLocaleString()}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {getStatusBadge(notification.status)}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => setSelectedNotification(notification)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                {notification.status === "Pending" && (
                                  <DropdownMenuItem onClick={() => handleSendNotification(notification.id)}>
                                    <Send className="mr-2 h-4 w-4" />
                                    Send Now
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="text-destructive"
                                  onClick={() => handleDeleteNotification(notification.id)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>Configure notification preferences and delivery methods</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <span className="ml-2">Loading settings...</span>
                  </div>
                ) : (
                  <>
                    <div className="space-y-6">
                      {defaultNotificationCategories.map((categoryInfo, index) => {
                        const setting = getSettingForCategory(categoryInfo.category)
                        return (
                          <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex-1">
                              <div className="font-medium">{categoryInfo.category}</div>
                              <div className="text-sm text-muted-foreground">{categoryInfo.description}</div>
                            </div>
                            <div className="flex items-center space-x-6">
                              <div className="flex items-center space-x-2">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <Label htmlFor={`email-${index}`} className="text-sm">
                                  Email
                                </Label>
                                <Switch 
                                  id={`email-${index}`} 
                                  checked={setting?.email_enabled ?? true}
                                  onCheckedChange={() => handleToggleSetting(categoryInfo.category, 'email_enabled')}
                                />
                              </div>
                              <div className="flex items-center space-x-2">
                                <Bell className="h-4 w-4 text-muted-foreground" />
                                <Label htmlFor={`push-${index}`} className="text-sm">
                                  Push
                                </Label>
                                <Switch 
                                  id={`push-${index}`} 
                                  checked={setting?.push_enabled ?? true}
                                  onCheckedChange={() => handleToggleSetting(categoryInfo.category, 'push_enabled')}
                                />
                              </div>
                              <div className="flex items-center space-x-2">
                                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                                <Label htmlFor={`sms-${index}`} className="text-sm">
                                  SMS
                                </Label>
                                <Switch 
                                  id={`sms-${index}`} 
                                  checked={setting?.sms_enabled ?? false}
                                  onCheckedChange={() => handleToggleSetting(categoryInfo.category, 'sms_enabled')}
                                />
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="campaigns" className="space-y-6">
            <EmailCampaignsPanel />
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Notification Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Notification</DialogTitle>
            <DialogDescription>Send a notification to a student or all students</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={newNotification.title}
                onChange={(e) => setNewNotification({ ...newNotification, title: e.target.value })}
                placeholder="Notification title"
              />
            </div>
            <div>
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={newNotification.message}
                onChange={(e) => setNewNotification({ ...newNotification, message: e.target.value })}
                placeholder="Notification message"
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">Type</Label>
                <Select
                  value={newNotification.type}
                  onValueChange={(value: any) => setNewNotification({ ...newNotification, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="General">General</SelectItem>
                    <SelectItem value="Payment">Payment</SelectItem>
                    <SelectItem value="Achievement">Achievement</SelectItem>
                    <SelectItem value="Reminder">Reminder</SelectItem>
                    <SelectItem value="Welcome">Welcome</SelectItem>
                    <SelectItem value="Course">Course</SelectItem>
                    <SelectItem value="System">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={newNotification.priority}
                  onValueChange={(value: any) => setNewNotification({ ...newNotification, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="recipient">Recipient (Optional - select "All Students" for broadcast)</Label>
                <Select
                  value={newNotification.recipient_id?.toString() || "all"}
                  onValueChange={(value) => {
                    if (value === "all") {
                      setNewNotification({ ...newNotification, recipient_id: undefined })
                    } else {
                      setNewNotification({ ...newNotification, recipient_id: parseInt(value) })
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a student (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Students</SelectItem>
                    {students.map((student) => (
                      <SelectItem key={student.id} value={student.id.toString()}>
                        {student.name} ({student.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="delivery_method">Delivery Method</Label>
                <Select
                  value={newNotification.delivery_method}
                  onValueChange={(value: any) => setNewNotification({ ...newNotification, delivery_method: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Email">Email</SelectItem>
                    <SelectItem value="Push">Push</SelectItem>
                    <SelectItem value="SMS">SMS</SelectItem>
                    <SelectItem value="In-App">In-App</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateNotification} disabled={loading || !newNotification.title || !newNotification.message}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Create Notification
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Notification Details Dialog */}
      {selectedNotification && (
        <Dialog 
          open={!!selectedNotification} 
          onOpenChange={() => {
            setSelectedNotification(null)
            setReadStatus(null)
          }}
        >
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedNotification.title}</DialogTitle>
              <DialogDescription>Notification Details</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Message</Label>
                <p className="text-sm mt-1">{selectedNotification.message}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Type</Label>
                  <p className="text-sm mt-1">{selectedNotification.type}</p>
                </div>
                <div>
                  <Label>Priority</Label>
                  <p className="text-sm mt-1">{selectedNotification.priority}</p>
                </div>
                <div>
                  <Label>Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedNotification.status)}</div>
                </div>
                <div>
                  <Label>Delivery Method</Label>
                  <p className="text-sm mt-1">{selectedNotification.delivery_method}</p>
                </div>
              </div>
              {selectedNotification.recipient_name ? (
                <div>
                  <Label>Recipient</Label>
                  <p className="text-sm mt-1">{selectedNotification.recipient_name}</p>
                </div>
              ) : (
                <div>
                  <Label>Recipient</Label>
                  <p className="text-sm mt-1">
                    <Badge variant="outline">All Students (Broadcast)</Badge>
                  </p>
                </div>
              )}
              <div>
                <Label>Created</Label>
                <p className="text-sm mt-1">{new Date(selectedNotification.created_at).toLocaleString()}</p>
              </div>
              {selectedNotification.sent_at && (
                <div>
                  <Label>Sent</Label>
                  <p className="text-sm mt-1">{new Date(selectedNotification.sent_at).toLocaleString()}</p>
                </div>
              )}

              {/* Read Status Section */}
              <div className="border-t pt-4 mt-4">
                <div className="flex items-center justify-between mb-4">
                  <Label className="text-base font-semibold">Read Status</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      setLoadingReadStatus(true)
                      try {
                        const response = await apiClient.getNotificationReadStatusById(selectedNotification.id)
                        if (response.success && response.data) {
                          setReadStatus(response.data)
                        }
                      } catch (error) {
                        console.error('Error fetching read status:', error)
                      } finally {
                        setLoadingReadStatus(false)
                      }
                    }}
                    disabled={loadingReadStatus}
                  >
                    {loadingReadStatus ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <Eye className="mr-2 h-4 w-4" />
                        Check Read Status
                      </>
                    )}
                  </Button>
                </div>

                {readStatus && (
                  <div className="space-y-4">
                    {/* Summary Stats */}
                    <div className="grid grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="p-3">
                          <div className="text-2xl font-bold text-primary">{readStatus.read_count}</div>
                          <p className="text-xs text-muted-foreground">Read</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-3">
                          <div className="text-2xl font-bold text-orange-600">{readStatus.unread_count}</div>
                          <p className="text-xs text-muted-foreground">Unread</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-3">
                          <div className="text-2xl font-bold">{readStatus.total_recipients}</div>
                          <p className="text-xs text-muted-foreground">Total Recipients</p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Read By List */}
                    {readStatus.read_by && readStatus.read_by.length > 0 && (
                      <div>
                        <Label className="text-sm font-semibold mb-2 block">
                          Read By ({readStatus.read_by.length})
                        </Label>
                        <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                          {readStatus.read_by.map((record: any) => (
                            <div
                              key={record.user_id}
                              className="flex items-center justify-between p-2 bg-green-50 rounded border border-green-200"
                            >
                              <div className="flex items-center space-x-2">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <div>
                                  <p className="text-sm font-medium">
                                    {record.user?.name || `User ${record.user_id}`}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {record.user?.email || 'No email'}
                                  </p>
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {new Date(record.read_at).toLocaleString()}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Unread By List */}
                    {readStatus.unread_by && readStatus.unread_by.length > 0 && (
                      <div>
                        <Label className="text-sm font-semibold mb-2 block">
                          Unread By ({readStatus.unread_by.length})
                        </Label>
                        <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                          {readStatus.unread_by.map((record: any) => (
                            <div
                              key={record.user_id}
                              className="flex items-center justify-between p-2 bg-orange-50 rounded border border-orange-200"
                            >
                              <div className="flex items-center space-x-2">
                                <Clock className="h-4 w-4 text-orange-600" />
                                <div>
                                  <p className="text-sm font-medium">
                                    {record.user?.name || `User ${record.user_id}`}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {record.user?.email || 'No email'}
                                  </p>
                                </div>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                Not Read
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {readStatus.read_count === 0 && readStatus.unread_count === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No read status data available</p>
                      </div>
                    )}
                  </div>
                )}

                {!readStatus && (
                  <div className="text-center py-4 text-muted-foreground">
                    <p className="text-sm">Click "Check Read Status" to see who has read this notification</p>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
