"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { format, parseISO } from "date-fns"
import { toast } from "sonner"
import { AlertCircle, Loader2, MessageCircle, RefreshCw, RotateCcw, Send, X } from "lucide-react"
import { useUser } from "@/lib/hooks/useUser"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

type ChatMessage = {
  id: number
  direction: "inbound" | "outbound"
  body: string
  status: string
  error: string | null
  template_id?: string | null
  created_at: string
  author_name?: string | null
}

function isFailedMessage(m: ChatMessage): boolean {
  const s = String(m.status || "").toLowerCase()
  return m.direction === "outbound" && (s === "failed" || s === "undelivered")
}

type SessionState = {
  open: boolean
  lastInboundAt: string | null
  expiresAt: string | null
}

type TemplateOption = {
  id: string
  label: string
  description: string
  preview: string
}

export function CrmLeadWhatsAppChat({
  leadId,
  phone,
  fullName,
}: {
  leadId: number
  phone: string | null
  fullName: string
}) {
  const { getAccessToken } = useUser()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [session, setSession] = useState<SessionState>({
    open: false,
    lastInboundAt: null,
    expiresAt: null,
  })
  const [templates, setTemplates] = useState<TemplateOption[]>([])
  const [draft, setDraft] = useState("")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [sending, setSending] = useState(false)
  const [retryingId, setRetryingId] = useState<number | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  const initials = useMemo(() => {
    const parts = fullName.trim().split(/\s+/).filter(Boolean)
    const letters = parts.slice(0, 2).map((p) => p[0]?.toUpperCase() || "")
    return letters.join("") || "WA"
  }, [fullName])

  const load = useCallback(
    async (opts?: { manual?: boolean }) => {
      if (opts?.manual) setRefreshing(true)
      try {
        const token = await getAccessToken()
        if (!token) return
        const res = await fetch(`/api/crm/portal/leads/${leadId}/whatsapp`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const json = await res.json().catch(() => ({}))
        if (json.success && json.data?.messages) {
          setMessages(json.data.messages as ChatMessage[])
          if (json.data.session) setSession(json.data.session as SessionState)
          setTemplates(Array.isArray(json.data.templates) ? (json.data.templates as TemplateOption[]) : [])
        } else if (opts?.manual) {
          toast.error(json.error || "Could not refresh WhatsApp thread")
        }
      } catch {
        if (opts?.manual) toast.error("Could not refresh WhatsApp thread")
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [getAccessToken, leadId]
  )

  useEffect(() => {
    if (!open) return
    setLoading(true)
    void load()
    const timer = window.setInterval(() => {
      void load()
    }, 5000)
    return () => window.clearInterval(timer)
  }, [load, open])

  useEffect(() => {
    if (!open) return
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length, open])

  const send = async (opts?: { templateId?: string; retryMessageId?: number }) => {
    const templateId = opts?.templateId
    const retryMessageId = opts?.retryMessageId
    const body = draft.trim()
    if (retryMessageId == null && !templateId && !body) return
    if (sending || retryingId != null) return
    if (retryMessageId != null) setRetryingId(retryMessageId)
    else setSending(true)
    try {
      const token = await getAccessToken()
      if (!token) throw new Error("missing token")
      const payload =
        retryMessageId != null
          ? { retry_message_id: retryMessageId }
          : templateId
            ? { template_id: templateId }
            : { body }
      const res = await fetch(`/api/crm/portal/leads/${leadId}/whatsapp`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })
      const json = await res.json().catch(() => ({}))
      if (!json.success) {
        toast.error(json.error || "WhatsApp send failed")
        if (json.data?.session) setSession(json.data.session as SessionState)
        if (Array.isArray(json.data?.templates)) {
          setTemplates(json.data.templates as TemplateOption[])
        }
        if (json.data?.message) {
          const updated = json.data.message as ChatMessage
          setMessages((prev) => {
            const idx = prev.findIndex((m) => m.id === updated.id)
            if (idx >= 0) {
              const next = [...prev]
              next[idx] = { ...prev[idx], ...updated }
              return next
            }
            return [...prev, updated]
          })
        }
      } else {
        if (retryMessageId == null) setDraft("")
        if (templateId) toast.success("Template sent — free chat unlocks when they reply")
        else if (retryMessageId != null) toast.success("Message resent")
      }
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "WhatsApp send failed")
    } finally {
      setSending(false)
      setRetryingId(null)
    }
  }

  const busy = sending || retryingId != null
  const freeFormDisabled = !phone || busy || !session.open
  const expiresLabel = session.expiresAt
    ? format(parseISO(session.expiresAt), "MMM d, h:mm a")
    : null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" onClick={() => setOpen(true)}>
        <MessageCircle className="h-4 w-4" />
        WhatsApp
      </Button>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          className={cn(
            "fixed inset-y-0 right-0 z-50 flex h-dvh w-full flex-col border-l bg-background p-0 shadow-lg outline-none sm:max-w-md",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right duration-200"
          )}
        >
          <div className="flex items-center gap-3 border-b bg-primary px-3 py-3 text-primary-foreground">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-foreground/20 text-sm font-semibold"
              aria-hidden
            >
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="truncate text-base font-semibold leading-tight">
                {fullName}
              </DialogTitle>
              <DialogDescription className="truncate text-sm text-primary-foreground/80">
                {phone || "No phone number on this lead"}
                {session.open && expiresLabel ? ` · Free chat until ${expiresLabel}` : ""}
              </DialogDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-11 w-11 text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground"
              onClick={() => void load({ manual: true })}
              disabled={refreshing || loading}
              aria-label="Refresh WhatsApp thread"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
            <DialogClose asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-11 w-11 text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground"
                aria-label="Close WhatsApp chat"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </div>

          <div className="relative min-h-0 flex-1">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[#e5ddd5] bg-[url('/images/whatsapp-chat-doodle.svg')] bg-repeat dark:bg-[#0b141a] dark:bg-none"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 hidden bg-[url('/images/whatsapp-chat-doodle.svg')] bg-repeat opacity-[0.18] invert dark:block"
            />
            <div className="absolute inset-0 z-10 overflow-y-auto px-3 py-4">
              {!loading && phone && !session.open ? (
                <div className="mb-3 rounded-md border border-amber-500/40 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:bg-amber-950/40 dark:text-amber-50">
                  Free-form chat is closed. Send a template below to re-engage them. The 24-hour
                  free-chat window reopens only after they reply.
                </div>
              ) : null}
              {loading ? (
                <p className="rounded-md bg-card/80 px-3 py-2 text-sm text-muted-foreground">
                  Loading conversation…
                </p>
              ) : messages.length === 0 ? (
                <p className="rounded-md bg-card/80 px-3 py-2 text-sm text-muted-foreground">
                  No WhatsApp messages yet. Use a template to start, then free chat unlocks after
                  they reply.
                </p>
              ) : (
                <div className="space-y-2">
                  {messages.map((m) => {
                    const inbound = m.direction === "inbound"
                    const failed = isFailedMessage(m)
                    const isRetrying = retryingId === m.id
                    return (
                      <div key={m.id} className={`flex ${inbound ? "justify-start" : "justify-end"}`}>
                        <div className="max-w-[85%] space-y-1.5">
                          <div
                            className={cn(
                              "rounded-2xl px-3 py-2 text-sm shadow-sm",
                              inbound
                                ? "rounded-tl-md bg-card text-card-foreground"
                                : failed
                                  ? "rounded-tr-md border border-red-300/80 bg-red-50 text-red-950 dark:border-red-800 dark:bg-red-950/50 dark:text-red-50"
                                  : "rounded-tr-md bg-primary text-primary-foreground"
                            )}
                          >
                            <p className="whitespace-pre-wrap">{m.body}</p>
                            <p
                              className={cn(
                                "mt-1 text-right text-xs",
                                inbound
                                  ? "text-muted-foreground"
                                  : failed
                                    ? "text-red-700/80 dark:text-red-200/80"
                                    : "text-primary-foreground/80"
                              )}
                            >
                              {format(parseISO(m.created_at), "h:mm a")}
                              {failed ? " · not delivered" : ""}
                            </p>
                          </div>
                          {failed ? (
                            <div className="rounded-lg border border-red-200 bg-card/95 px-2.5 py-2 text-xs text-red-900 shadow-sm dark:border-red-900 dark:text-red-100">
                              <div className="flex gap-2">
                                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                <p className="min-w-0 flex-1 leading-snug">
                                  {m.error?.trim() || "Message failed to send."}
                                </p>
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="mt-2 h-8 w-full gap-1.5 border-red-300 text-red-900 hover:bg-red-50 dark:border-red-800 dark:text-red-100 dark:hover:bg-red-950/60"
                                disabled={busy}
                                onClick={() => void send({ retryMessageId: m.id })}
                              >
                                {isRetrying ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <RotateCcw className="h-3.5 w-3.5" />
                                )}
                                {isRetrying ? "Retrying…" : "Retry send"}
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </div>

          <div className="space-y-2 border-t bg-background p-3">
            {!session.open && phone && templates.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Window closed — send a Utility template
                </p>
                <p className="text-[11px] leading-snug text-muted-foreground">
                  Marketing templates are blocked by Meta (error 63049). Free chat unlocks when they reply.
                </p>
                <div className="max-h-44 space-y-2 overflow-y-auto">
                  {templates.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      disabled={busy}
                      onClick={() => void send({ templateId: t.id })}
                      className="w-full rounded-md border bg-card px-3 py-2 text-left transition hover:bg-muted/60 disabled:opacity-60"
                    >
                      <div className="text-sm font-medium">{t.label}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{t.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            <form
              className="flex items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                void send()
              }}
            >
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={1}
                className="min-h-11 max-h-32 resize-none"
                placeholder={
                  !phone
                    ? "Add a phone number to chat"
                    : session.open
                      ? "Type a message"
                      : "Free-form locked — send a template, then wait for their reply"
                }
                disabled={freeFormDisabled}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    void send()
                  }
                }}
              />
              <Button
                type="submit"
                size="icon"
                className="h-11 w-11 shrink-0 rounded-full"
                disabled={freeFormDisabled || !draft.trim()}
                aria-label="Send WhatsApp message"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  )
}
