"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  Plus,
  Mail,
  Send,
  Users,
  TrendingUp,
  Eye,
  Calendar,
  MoreHorizontal,
  Edit,
  Copy,
  Trash2,
  Play,
  Pause,
  Loader2,
} from "lucide-react"
import { useEmailCampaigns } from "@/lib/hooks/useEmailCampaigns"
import { useState } from "react"

// Campaign form state
interface CampaignForm {
  name: string
  subject: string
  template: string
  segment: string
  content: string
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case "Sent":
      return (
        <Badge variant="default" className="bg-chart-3 text-white">
          <Send className="mr-1 h-3 w-3" />
          Sent
        </Badge>
      )
    case "Scheduled":
      return (
        <Badge variant="default" className="bg-chart-4 text-white">
          <Calendar className="mr-1 h-3 w-3" />
          Scheduled
        </Badge>
      )
    case "Draft":
      return <Badge variant="secondary">Draft</Badge>
    case "Active":
      return (
        <Badge variant="default" className="bg-chart-1 text-white">
          <Play className="mr-1 h-3 w-3" />
          Active
        </Badge>
      )
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

export default function EmailCampaignPage() {
  const { 
    campaigns, 
    templates, 
    segments, 
    stats, 
    loading, 
    error, 
    createCampaign, 
    sendCampaign, 
    updateCampaign, 
    deleteCampaign 
  } = useEmailCampaigns()

  const [campaignForm, setCampaignForm] = useState<CampaignForm>({
    name: '',
    subject: '',
    template: '',
    segment: '',
    content: ''
  })

  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('campaigns')

  // Filter campaigns based on search
  const filteredCampaigns = campaigns.filter(campaign =>
    campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    campaign.subject.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleCreateCampaign = async () => {
    if (!campaignForm.name || !campaignForm.subject || !campaignForm.segment) {
      alert('Please fill in all required fields')
      return
    }

    await createCampaign({
      name: campaignForm.name,
      subject: campaignForm.subject,
      template: campaignForm.template,
      segment: campaignForm.segment,
      content: campaignForm.content
    })

    // Reset form
    setCampaignForm({
      name: '',
      subject: '',
      template: '',
      segment: '',
      content: ''
    })
  }

  const handleSendCampaign = async (campaignId: string) => {
    if (confirm('Are you sure you want to send this campaign?')) {
      await sendCampaign(campaignId)
    }
  }

  const handleDeleteCampaign = async (campaignId: string) => {
    if (confirm('Are you sure you want to delete this campaign?')) {
      await deleteCampaign(campaignId)
    }
  }

  if (loading && !stats) {
    return (
              <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading email campaigns...</span>
        </div>
    )
  }

  if (error) {
    return (
              <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-600 mb-4">Error loading email campaigns: {error}</p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
        </div>
    )
  }

  return (
          <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-foreground">Email Campaign</h2>
            <p className="text-muted-foreground mt-2">Create and manage email marketing campaigns</p>
          </div>
          <div className="flex space-x-2">
            <Button 
              className="bg-primary hover:bg-primary/90"
              onClick={() => setActiveTab('create')}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Campaign
            </Button>
          </div>
        </div>

        {/* Campaign Statistics */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-foreground">{stats?.totalCampaigns || 0}</div>
                  <p className="text-xs text-muted-foreground">Total Campaigns</p>
                </div>
                <Mail className="h-8 w-8 text-chart-1" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-foreground">{(stats?.totalRecipients || 0).toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">Total Recipients</p>
                </div>
                <Users className="h-8 w-8 text-chart-2" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-foreground">{stats?.averageOpenRate.toFixed(1) || 0}%</div>
                  <p className="text-xs text-muted-foreground">Avg Open Rate</p>
                </div>
                <Eye className="h-8 w-8 text-chart-3" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-foreground">{stats?.sentCampaigns || 0}</div>
                  <p className="text-xs text-muted-foreground">Sent This Month</p>
                </div>
                <TrendingUp className="h-8 w-8 text-chart-4" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Email Campaign Management */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="segments">Segments</TabsTrigger>
            <TabsTrigger value="create">Create Campaign</TabsTrigger>
          </TabsList>

          <TabsContent value="campaigns" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Campaign Management</CardTitle>
                <CardDescription>View and manage all email campaigns</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input 
                      placeholder="Search campaigns..." 
                      className="pl-10" 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Button variant="outline">Filter</Button>
                  <Button variant="outline">Export</Button>
                </div>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Campaign</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Recipients</TableHead>
                        <TableHead>Open Rate</TableHead>
                        <TableHead>Click Rate</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCampaigns.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            {loading ? (
                              <div className="flex items-center justify-center">
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Loading...
                              </div>
                            ) : (
                              "No campaigns found"
                            )}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredCampaigns.map((campaign) => (
                          <TableRow key={campaign.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium text-foreground">{campaign.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {campaign.sentDate
                                    ? `Sent: ${new Date(campaign.sentDate).toLocaleDateString()}`
                                    : "Not sent"}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="max-w-xs truncate">{campaign.subject}</div>
                            </TableCell>
                            <TableCell>
                              <div className="text-center">
                                <div className="font-medium">{campaign.recipients.toLocaleString()}</div>
                                <div className="text-xs text-muted-foreground">{campaign.segment}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-center">
                                <div className="font-medium">{campaign.openRate}%</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-center">
                                <div className="font-medium">{campaign.clickRate}%</div>
                              </div>
                            </TableCell>
                            <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuItem>
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Campaign
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit Campaign
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Copy className="mr-2 h-4 w-4" />
                                    Duplicate
                                  </DropdownMenuItem>
                                  {campaign.status === "Draft" && (
                                    <DropdownMenuItem onClick={() => handleSendCampaign(campaign.id)}>
                                      <Send className="mr-2 h-4 w-4" />
                                      Send Now
                                    </DropdownMenuItem>
                                  )}
                                  {campaign.status === "Active" && (
                                    <DropdownMenuItem>
                                      <Pause className="mr-2 h-4 w-4" />
                                      Pause Campaign
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    className="text-destructive"
                                    onClick={() => handleDeleteCampaign(campaign.id)}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete Campaign
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Email Templates</CardTitle>
                <CardDescription>Manage reusable email templates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {templates.map((template) => (
                    <div key={template.id} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium text-foreground">{template.name}</h4>
                          <p className="text-sm text-muted-foreground">{template.description}</p>
                        </div>
                        <Badge variant="outline">{template.category}</Badge>
                      </div>
                      <div className="flex justify-between items-center text-sm text-muted-foreground">
                        <span>Used {template.usage} times</span>
                        <span>Last used: {new Date(template.lastUsed).toLocaleDateString()}</span>
                      </div>
                      <div className="flex space-x-2 mt-3">
                        <Button size="sm" variant="outline">
                          <Edit className="mr-1 h-3 w-3" />
                          Edit
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setCampaignForm(prev => ({
                              ...prev,
                              template: template.name,
                              content: template.content
                            }))
                          }}
                        >
                          <Copy className="mr-1 h-3 w-3" />
                          Use Template
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="segments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Audience Segments</CardTitle>
                <CardDescription>Manage email recipient segments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {segments.map((segment, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium text-foreground">{segment.name}</h4>
                          <p className="text-sm text-muted-foreground">{segment.description}</p>
                        </div>
                        <Badge variant="secondary">{segment.count} contacts</Badge>
                      </div>
                      <div className="flex space-x-2 mt-3">
                        <Button size="sm" variant="outline">
                          <Edit className="mr-1 h-3 w-3" />
                          Edit
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setCampaignForm(prev => ({
                              ...prev,
                              segment: segment.name
                            }))
                          }}
                        >
                          <Mail className="mr-1 h-3 w-3" />
                          Send Campaign
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="create" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Create New Campaign</CardTitle>
                <CardDescription>Design and schedule a new email campaign</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Campaign Name</label>
                    <Input 
                      placeholder="Enter campaign name" 
                      value={campaignForm.name}
                      onChange={(e) => setCampaignForm(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Subject Line</label>
                    <Input 
                      placeholder="Enter email subject" 
                      value={campaignForm.subject}
                      onChange={(e) => setCampaignForm(prev => ({ ...prev, subject: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Template</label>
                    <select 
                      className="w-full p-2 border rounded-md"
                      value={campaignForm.template}
                      onChange={(e) => setCampaignForm(prev => ({ ...prev, template: e.target.value }))}
                    >
                      <option value="">Select a template</option>
                      {templates.map((template) => (
                        <option key={template.id} value={template.name}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Audience Segment</label>
                    <select 
                      className="w-full p-2 border rounded-md"
                      value={campaignForm.segment}
                      onChange={(e) => setCampaignForm(prev => ({ ...prev, segment: e.target.value }))}
                    >
                      <option value="">Select audience</option>
                      {segments.map((segment, index) => (
                        <option key={index} value={segment.name}>
                          {segment.name} ({segment.count} contacts)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Email Content</label>
                  <textarea 
                    className="w-full p-3 border rounded-md h-32 resize-none"
                    placeholder="Enter your email content here..."
                    value={campaignForm.content}
                    onChange={(e) => setCampaignForm(prev => ({ ...prev, content: e.target.value }))}
                  />
                </div>

                <div className="flex space-x-2">
                  <Button 
                    className="bg-primary hover:bg-primary/90"
                    onClick={handleCreateCampaign}
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="mr-2 h-4 w-4" />
                    )}
                    Create Campaign
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  )
}
