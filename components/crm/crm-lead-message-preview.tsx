"use client"

import { useMemo } from "react"
import { Mail, MessageCircle } from "lucide-react"
import type { CrmLead } from "@/lib/crm/types"
import {
  buildLeadWelcomeEmailHtml,
  buildLeadWelcomeWhatsAppBody,
  leadWelcomeSubject,
  resolveLeadWelcomePreviewVars,
} from "@/lib/crm/lead-welcome-templates"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type Delivery = {
  emailSent?: boolean
  emailError?: string | null
  whatsappSent?: boolean
  whatsappError?: string | null
}

function DeliveryBadge({ sent, error }: { sent?: boolean; error?: string | null }) {
  if (sent) return <Badge className="bg-emerald-600 hover:bg-emerald-700">Sent</Badge>
  if (error) {
    return (
      <Badge variant="secondary" title={error}>
        Not sent
      </Badge>
    )
  }
  return <Badge variant="outline">Preview</Badge>
}

export function CrmLeadMessagePreview({
  lead,
  delivery,
}: {
  lead: CrmLead
  delivery?: Delivery
}) {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://sms.edtec.online"
  const vars = useMemo(
    () => resolveLeadWelcomePreviewVars(lead, origin),
    [lead, origin]
  )
  const emailHtml = useMemo(() => buildLeadWelcomeEmailHtml(vars), [vars])
  const whatsappBody = useMemo(() => buildLeadWelcomeWhatsAppBody(vars), [vars])
  const subject = leadWelcomeSubject(vars.course_name)

  return (
    <Card>
      <CardHeader>
        <CardTitle>EdBot messages</CardTitle>
        <CardDescription>
          Preview of the email and WhatsApp confirmation sent when this lead first entered the CRM.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Mail className="h-4 w-4" />
                Email
              </div>
              <DeliveryBadge sent={delivery?.emailSent} error={delivery?.emailError} />
            </div>
            <p className="truncate text-xs text-muted-foreground">To: {lead.email}</p>
            <p className="truncate text-xs text-muted-foreground">Subject: {subject}</p>
            <iframe
              title="Email preview"
              sandbox=""
              srcDoc={emailHtml}
              className="h-[420px] w-full rounded-lg border bg-white"
            />
            {delivery?.emailError ? (
              <p className="text-xs text-amber-600 dark:text-amber-400">{delivery.emailError}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </div>
              <DeliveryBadge sent={delivery?.whatsappSent} error={delivery?.whatsappError} />
            </div>
            <p className="truncate text-xs text-muted-foreground">
              To: {lead.phone || "No phone on this lead"}
            </p>
            <div className="flex min-h-[420px] flex-col rounded-lg border bg-[#ece5dd] p-3">
              <div className="mt-auto max-w-[92%] self-end rounded-lg rounded-br-sm bg-[#dcf8c6] px-3 py-2 text-sm leading-relaxed text-[#111b21] shadow-sm">
                <p className="whitespace-pre-wrap">{whatsappBody}</p>
              </div>
            </div>
            {delivery?.whatsappError ? (
              <p className="text-xs text-amber-600 dark:text-amber-400">{delivery.whatsappError}</p>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
