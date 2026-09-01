"use client"

import React, { useState, useEffect, useCallback } from "react"
import StudentLayout from "@/components/student/student-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useUser } from "@/lib/hooks/useUser"
import {
  MessageSquare,
  Phone,
  Mail,
  HelpCircle,
  Loader2,
  AlertCircle,
} from "lucide-react"

const supportCategories = [
  "Academic Support",
  "Technical Issues",
  "Financial Aid",
  "Course Registration",
  "Library Services",
  "Student Services",
  "Other",
]

function formatDate(dateStr: string) {
  if (!dateStr) return "—"
  const d = new Date(dateStr)
  return d.toLocaleDateString()
}

export default function SupportPage() {
  const { user, isAuthenticated, isLoading, getAccessToken } = useUser()

  const [supportTickets, setSupportTickets] = useState<any[]>([])
  const [ticketsLoading, setTicketsLoading] = useState(true)
  const [ticketsError, setTicketsError] = useState<string | null>(null)
  const [ticketForm, setTicketForm] = useState({
    title: "",
    category: "",
    priority: "",
    description: "",
  })
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false)
  const [ticketMessage, setTicketMessage] = useState("")

  const fetchSupportTickets = useCallback(async () => {
    const token = await getAccessToken()
    if (!token) {
      setTicketsError("Authentication required")
      setTicketsLoading(false)
      return
    }
    setTicketsLoading(true)
    setTicketsError(null)
    try {
      const res = await fetch("/api/support/tickets", {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.success && data.data) {
        setSupportTickets(data.data)
      } else {
        setTicketsError(data.message || "Failed to load tickets")
      }
    } catch {
      setTicketsError("Failed to load support tickets")
    } finally {
      setTicketsLoading(false)
    }
  }, [getAccessToken])

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchSupportTickets()
    } else {
      setTicketsLoading(false)
    }
  }, [isAuthenticated, user, fetchSupportTickets])

  const handleTicketInputChange = (field: string, value: string) => {
    setTicketForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmitTicket = async () => {
    if (!user) {
      setTicketMessage("Please log in to submit a support ticket")
      return
    }

    if (
      !ticketForm.title.trim() ||
      !ticketForm.category ||
      !ticketForm.priority ||
      !ticketForm.description.trim()
    ) {
      setTicketMessage("Please fill in all required fields")
      return
    }

    setIsSubmittingTicket(true)
    setTicketMessage("")

    try {
      const token = await getAccessToken()
      if (!token) {
        setTicketMessage("Authentication failed. Please log in again.")
        setIsSubmittingTicket(false)
        setTimeout(() => setTicketMessage(""), 5000)
        return
      }

      const response = await fetch("/api/support/tickets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: ticketForm.title,
          category: ticketForm.category,
          priority: ticketForm.priority,
          description: ticketForm.description,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setTicketMessage("Support ticket created successfully! You will receive an email confirmation.")
        setTicketForm({ title: "", category: "", priority: "", description: "" })
        fetchSupportTickets()
      } else {
        setTicketMessage(result.message || "Failed to create support ticket")
      }
    } catch {
      setTicketMessage("Failed to create support ticket. Please try again.")
    } finally {
      setIsSubmittingTicket(false)
      setTimeout(() => setTicketMessage(""), 5000)
    }
  }

  if (isLoading || !isAuthenticated || !user) {
    return (
      <StudentLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-brand-blue" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Loading...</h2>
            <p className="text-gray-600 dark:text-gray-400">Please wait while we load the support page</p>
          </div>
        </div>
      </StudentLayout>
    )
  }

  if (ticketsError && !ticketsLoading) {
    return (
      <StudentLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Error Loading</h2>
            <p className="text-gray-600 dark:text-gray-400">{ticketsError}</p>
          </div>
        </div>
      </StudentLayout>
    )
  }

  return (
    <StudentLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-3xl font-bold text-foreground">Get Support</h2>
          <p className="text-muted-foreground mt-2">
            Submit a support ticket or get in touch with our team for assistance
          </p>
        </div>

        {/* Create Ticket & Contact Info */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-2 border-brand-blue/10 dark:border-brand-blue/20 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="mr-2 h-5 w-5 text-brand-blue" />
                Create Support Ticket
              </CardTitle>
              <CardDescription>Submit a new support request</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="ticketTitle">Title</Label>
                  <Input
                    id="ticketTitle"
                    placeholder="Brief description of your issue"
                    value={ticketForm.title}
                    onChange={(e) => handleTicketInputChange("title", e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="ticketCategory">Category</Label>
                  <Select
                    value={ticketForm.category}
                    onValueChange={(value) => handleTicketInputChange("category", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {supportCategories.map((category) => (
                        <SelectItem key={category} value={category.toLowerCase()}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="ticketPriority">Priority</Label>
                  <Select
                    value={ticketForm.priority}
                    onValueChange={(value) => handleTicketInputChange("priority", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="ticketDescription">Description</Label>
                  <Textarea
                    id="ticketDescription"
                    placeholder="Please provide detailed information about your issue..."
                    rows={4}
                    value={ticketForm.description}
                    onChange={(e) => handleTicketInputChange("description", e.target.value)}
                  />
                </div>
                {ticketMessage && (
                  <div
                    className={`text-sm p-3 rounded-md ${
                      ticketMessage.includes("successfully")
                        ? "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800"
                        : "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800"
                    }`}
                  >
                    {ticketMessage}
                  </div>
                )}
                <Button
                  className="w-full bg-brand-blue hover:bg-brand-blue-light"
                  onClick={handleSubmitTicket}
                  disabled={isSubmittingTicket}
                >
                  {isSubmittingTicket ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <MessageSquare className="mr-2 h-4 w-4" />
                  )}
                  {isSubmittingTicket ? "Submitting..." : "Submit Ticket"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-brand-blue/10 dark:border-brand-blue/20 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center">
                <HelpCircle className="mr-2 h-5 w-5 text-brand-blue" />
                Contact Information
              </CardTitle>
              <CardDescription>Get in touch with our support team</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-3 p-3 border rounded-lg border-brand-blue/10 dark:border-brand-blue/20">
                  <Phone className="h-5 w-5 text-brand-blue" />
                  <div>
                    <p className="font-medium">Phone Support</p>
                    <p className="text-sm text-muted-foreground">+1 (555) 123-4567</p>
                    <p className="text-xs text-muted-foreground">Mon-Fri: 8:00 AM - 6:00 PM</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 border rounded-lg border-brand-blue/10 dark:border-brand-blue/20">
                  <Mail className="h-5 w-5 text-brand-blue" />
                  <div>
                    <p className="font-medium">Email Support</p>
                    <p className="text-sm text-muted-foreground">support@edtec.online</p>
                    <p className="text-xs text-muted-foreground">Response within 24 hours</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* My Support Tickets */}
        <Card className="border-2 border-brand-blue/10 dark:border-brand-blue/20 shadow-md">
          <CardHeader>
            <CardTitle>My Support Tickets</CardTitle>
            <CardDescription>Track your existing support requests and their status</CardDescription>
          </CardHeader>
          <CardContent>
            {ticketsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-brand-blue" />
              </div>
            ) : supportTickets.length === 0 ? (
              <div className="text-center p-6">
                <HelpCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No Support Tickets</h3>
                <p className="text-muted-foreground">You don&apos;t have any support requests yet. Submit one above to get started.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {supportTickets.map((ticket: any) => (
                  <div
                    key={ticket.id}
                    className="p-4 border rounded-lg border-brand-blue/10 dark:border-brand-blue/20"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium">{ticket.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {ticket.category} • Ref: {ticket.ticket_reference} • Created: {formatDate(ticket.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={ticket.status === "open" ? "outline" : "secondary"}>
                          {ticket.status.replace("_", " ")}
                        </Badge>
                        <Badge variant={ticket.priority === "high" || ticket.priority === "urgent" ? "destructive" : "outline"}>
                          {ticket.priority}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Last updated: {formatDate(ticket.updated_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </StudentLayout>
  )
}
