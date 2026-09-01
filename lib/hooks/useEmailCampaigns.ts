import { useState, useCallback, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { apiClient } from '@/lib/api'
import { toast } from 'sonner'

export interface EmailCampaign {
  id: string
  name: string
  subject: string
  status: 'Draft' | 'Scheduled' | 'Sent' | 'Active' | 'Paused'
  recipients: number
  openRate: number
  clickRate: number
  sentDate: string | null
  template: string
  segment: string
  content?: string
  scheduledDate?: string
  created_at: string
  updated_at: string
}

export interface EmailTemplate {
  id: string
  name: string
  category: string
  description: string
  content: string
  lastUsed: string
  usage: number
  created_at: string
  updated_at: string
}

export interface EmailSegment {
  name: string
  count: number
  description: string
  criteria: any
}

export interface CampaignStats {
  totalCampaigns: number
  sentCampaigns: number
  totalRecipients: number
  averageOpenRate: number
  totalEmailsSent: number
}

interface UseEmailCampaignsReturn {
  campaigns: EmailCampaign[]
  templates: EmailTemplate[]
  segments: EmailSegment[]
  stats: CampaignStats | null
  loading: boolean
  error: string | null
  createCampaign: (campaign: Partial<EmailCampaign>) => Promise<EmailCampaign>
  sendCampaign: (campaignId: string) => Promise<void>
  updateCampaign: (campaignId: string, updates: Partial<EmailCampaign>) => Promise<void>
  deleteCampaign: (campaignId: string) => Promise<void>
  refreshData: () => Promise<void>
}

export function useEmailCampaigns(): UseEmailCampaignsReturn {
  const { getToken } = useAuth()
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([])
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [segments, setSegments] = useState<EmailSegment[]>([])
  const [stats, setStats] = useState<CampaignStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch students for segments
      const studentsResponse = await apiClient.getStudents({ limit: 1000 })
      const students = studentsResponse.data || []

      // Fetch enrollments for completion data
      const enrollmentsResponse = await apiClient.getEnrollments({ limit: 1000 })
      const enrollments = enrollmentsResponse.data || []

      // Fetch purchases for payment data
      const purchasesResponse = await apiClient.getPurchases({ limit: 1000 })
      const purchases = purchasesResponse.data || []

      // Generate segments from real data
      const generatedSegments: EmailSegment[] = [
        {
          name: "All Students",
          count: students.length,
          description: "All enrolled students",
          criteria: { type: "all_students" }
        },
        {
          name: "Recent Graduates",
          count: enrollments.filter(e => e.status === 'completed').length,
          description: "Students who completed courses in last 30 days",
          criteria: { type: "completed_enrollments" }
        },
        {
          name: "Active Students",
          count: enrollments.filter(e => e.status === 'active' || e.status === 'in_progress').length,
          description: "Students currently enrolled in courses",
          criteria: { type: "active_enrollments" }
        },
        {
          name: "Overdue Payments",
          count: purchases.filter(p => p.status === 'pending' || p.status === 'processing').length,
          description: "Students with outstanding payments",
          criteria: { type: "overdue_payments" }
        }
      ]

      // Generate mock campaigns (since we don't have a campaigns table yet)
      const mockCampaigns: EmailCampaign[] = [
        {
          id: "1",
          name: "Welcome New Students",
          subject: "Welcome to EdTec.online - Your Learning Journey Begins!",
          status: "Sent",
          recipients: students.length,
          openRate: 24.5,
          clickRate: 3.2,
          sentDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          template: "Welcome",
          segment: "All Students",
          created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: "2",
          name: "Course Completion Congratulations",
          subject: "Congratulations on completing your course!",
          status: "Sent",
          recipients: enrollments.filter(e => e.status === 'completed').length,
          openRate: 67.4,
          clickRate: 12.4,
          sentDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          template: "Achievement",
          segment: "Recent Graduates",
          created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: "3",
          name: "Payment Reminder",
          subject: "Payment Due - Action Required",
          status: "Scheduled",
          recipients: purchases.filter(p => p.status === 'pending').length,
          openRate: 0,
          clickRate: 0,
          sentDate: null,
          template: "Reminder",
          segment: "Overdue Payments",
          scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]

      // Generate templates
      const mockTemplates: EmailTemplate[] = [
        {
          id: "1",
          name: "Welcome Email",
          category: "Onboarding",
          description: "Welcome new students to the platform",
          content: "Welcome to EdTec.online! We're excited to have you join our learning community.",
          lastUsed: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          usage: 45,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: "2",
          name: "Course Reminder",
          category: "Educational",
          description: "Remind students about upcoming deadlines",
          content: "Don't forget about your upcoming course deadline. Keep up the great work!",
          lastUsed: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          usage: 128,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: "3",
          name: "Payment Notification",
          category: "Billing",
          description: "Payment confirmations and reminders",
          content: "Your payment is due. Please complete your payment to continue your course access.",
          lastUsed: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          usage: 67,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]

      // Calculate stats
      const totalCampaigns = mockCampaigns.length
      const sentCampaigns = mockCampaigns.filter(c => c.status === 'Sent').length
      const totalRecipients = mockCampaigns.reduce((acc, c) => acc + c.recipients, 0)
      const averageOpenRate = mockCampaigns
        .filter(c => c.openRate > 0)
        .reduce((acc, c) => acc + c.openRate, 0) / mockCampaigns.filter(c => c.openRate > 0).length || 0

      setCampaigns(mockCampaigns)
      setTemplates(mockTemplates)
      setSegments(generatedSegments)
      setStats({
        totalCampaigns,
        sentCampaigns,
        totalRecipients,
        averageOpenRate,
        totalEmailsSent: totalRecipients
      })

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch email campaign data'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  const createCampaign = useCallback(async (campaign: Partial<EmailCampaign>): Promise<EmailCampaign> => {
    try {
      setLoading(true)
      setError(null)

      // In a real implementation, this would call an API to create a campaign
      const newCampaign: EmailCampaign = {
        id: Date.now().toString(),
        name: campaign.name || 'New Campaign',
        subject: campaign.subject || 'New Email Subject',
        status: 'Draft',
        recipients: 0,
        openRate: 0,
        clickRate: 0,
        sentDate: null,
        template: campaign.template || 'Custom',
        segment: campaign.segment || 'All Students',
        content: campaign.content || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      setCampaigns(prev => [newCampaign, ...prev])
      toast.success('Campaign created successfully')
      return newCampaign
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create campaign'
      setError(errorMessage)
      toast.error(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const sendCampaign = useCallback(async (campaignId: string) => {
    try {
      setLoading(true)
      setError(null)

      const campaign = campaigns.find(c => c.id === campaignId)
      if (!campaign) {
        throw new Error('Campaign not found')
      }

      // Get recipients based on segment
      let recipients: any[] = []
      const studentsResponse = await apiClient.getStudents({ limit: 1000 })
      const students = studentsResponse.data || []

      switch (campaign.segment) {
        case 'All Students':
          recipients = students
          break
        case 'Recent Graduates':
          const enrollmentsResponse = await apiClient.getEnrollments({ limit: 1000 })
          const enrollments = enrollmentsResponse.data || []
          const completedEnrollments = enrollments.filter(e => e.status === 'completed')
          recipients = students.filter(s => completedEnrollments.some(e => e.student_id === s.id))
          break
        case 'Overdue Payments':
          const purchasesResponse = await apiClient.getPurchases({ limit: 1000 })
          const purchases = purchasesResponse.data || []
          const overduePurchases = purchases.filter(p => p.status === 'pending')
          recipients = students.filter(s => overduePurchases.some(p => p.user_id === s.id))
          break
        default:
          recipients = students
      }

      // Send emails with rate limiting (2 requests per second max)
      const results = []
      const batchSize = 2 // Send 2 emails at a time
      const delay = 1000 // Wait 1 second between batches
      
      
      for (let i = 0; i < recipients.length; i += batchSize) {
        const batch = recipients.slice(i, i + batchSize)
        const batchNumber = Math.floor(i / batchSize) + 1
        const totalBatches = Math.ceil(recipients.length / batchSize)
        
        
        const batchPromises = batch.map(async (recipient) => {
          try {
            const response = await fetch('/api/send-email', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                to: recipient.email,
                subject: campaign.subject,
                html: campaign.content || `<h1>${campaign.subject}</h1><p>Hello ${recipient.name},</p><p>This is your email content.</p>`,
                from: 'noreply@edtec.online'
              })
            })

            if (!response.ok) {
              throw new Error(`Failed to send email to ${recipient.email}`)
            }

            return { success: true, email: recipient.email }
          } catch (error) {
            console.error(`Failed to send email to ${recipient.email}:`, error)
            return { success: false, email: recipient.email, error }
          }
        })

        const batchResults = await Promise.all(batchPromises)
        results.push(...batchResults)
        
        
        // Wait before sending the next batch (except for the last batch)
        if (i + batchSize < recipients.length) {
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
      
      const successful = results.filter(r => r.success).length
      const failed = results.filter(r => !r.success).length

      // Update campaign status
      setCampaigns(prev => prev.map(c => 
        c.id === campaignId 
          ? { 
              ...c, 
              status: 'Sent' as const, 
              recipients: successful,
              sentDate: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          : c
      ))

      if (failed > 0) {
        toast.warning(`Campaign sent to ${successful} recipients. ${failed} emails failed.`)
      } else {
        toast.success(`Campaign sent successfully to ${successful} recipients!`)
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send campaign'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [campaigns])

  const updateCampaign = useCallback(async (campaignId: string, updates: Partial<EmailCampaign>) => {
    try {
      setLoading(true)
      setError(null)

      setCampaigns(prev => prev.map(c => 
        c.id === campaignId 
          ? { ...c, ...updates, updated_at: new Date().toISOString() }
          : c
      ))

      toast.success('Campaign updated successfully')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update campaign'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteCampaign = useCallback(async (campaignId: string) => {
    try {
      setLoading(true)
      setError(null)

      setCampaigns(prev => prev.filter(c => c.id !== campaignId))
      toast.success('Campaign deleted successfully')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete campaign'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshData = useCallback(async () => {
    await fetchData()
  }, [fetchData])

  // Load data on mount
  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    campaigns,
    templates,
    segments,
    stats,
    loading,
    error,
    createCampaign,
    sendCampaign,
    updateCampaign,
    deleteCampaign,
    refreshData
  }
}
