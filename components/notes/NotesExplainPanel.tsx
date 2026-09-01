"use client"

import { useEffect, useRef, useState } from "react"
import { Bot, Loader2, Send, Sparkles } from "lucide-react"
import { CoachRichText } from "@/components/quiz/QuizAnalysisPanel"
import { cn } from "@/lib/utils"

type ChatMessage = { role: "user" | "model"; content: string }

export type NotesExplainContext = {
  noteTitle: string
  noteKind?: string
  noteBody?: string
  noteBullets?: string[]
  sectionTitle?: string
  levelTitle?: string
  courseName?: string
}

function buildLocalNoteHelp(ctx: NotesExplainContext): string {
  const bullets = (ctx.noteBullets ?? []).slice(0, 3)
  const lines = [
    `Let’s unpack **${ctx.noteTitle}**${ctx.sectionTitle ? ` from “${ctx.sectionTitle}”` : ""}.`,
    ctx.noteBody
      ? `Core idea: ${ctx.noteBody.slice(0, 220)}${ctx.noteBody.length > 220 ? "…" : ""}`
      : "Focus on what this card is asking you to notice, decide, or remember in practice.",
  ]
  if (bullets.length > 0) {
    lines.push("Key points to lock in:")
    for (const b of bullets) lines.push(`* ${b}`)
  }
  lines.push("Study tips:")
  lines.push("* **Teach-back:** Explain this card aloud in one plain sentence")
  lines.push("* **Link:** Connect it to one real workplace scenario you have seen or studied")
  lines.push("* **Check:** Write one action this note would change in your next task")
  return lines.join("\n")
}

async function readNotesExplainStream(
  payload: NotesExplainContext & { messages: ChatMessage[] },
  signal: AbortSignal,
  onDelta: (full: string) => void
): Promise<string> {
  const res = await fetch("/api/notes/explain", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify(payload),
    signal,
  })

  if (!res.ok) {
    throw new Error("Notes explain request failed")
  }

  const contentType = res.headers.get("content-type") ?? ""
  if (contentType.includes("application/json")) {
    const data = (await res.json()) as { success?: boolean; text?: string }
    if (data.success && data.text) {
      onDelta(data.text)
      return data.text
    }
    throw new Error("Empty AI response")
  }

  if (!res.body) throw new Error("Empty stream")

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  let full = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const parts = buffer.split("\n\n")
    buffer = parts.pop() ?? ""
    for (const part of parts) {
      const line = part.split("\n").find((entry) => entry.startsWith("data: "))
      if (!line) continue
      const event = JSON.parse(line.slice(6)) as {
        text?: string
        done?: boolean
        error?: string
      }
      if (event.error) throw new Error(event.error)
      if (event.text) {
        full += event.text
        onDelta(full)
      }
    }
  }

  if (!full.trim()) throw new Error("Empty AI response")
  return full
}

export function NotesExplainPanel({
  context,
  className,
  autoStart = false,
}: {
  context: NotesExplainContext
  className?: string
  /** When true, kick off the explanation as soon as the panel mounts / context changes. */
  autoStart?: boolean
}) {
  const [started, setStarted] = useState(autoStart)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [input, setInput] = useState("")
  const contextKey = `${context.noteTitle}|${context.noteBody ?? ""}|${(context.noteBullets ?? []).join("|")}`
  const [activeKey, setActiveKey] = useState(contextKey)
  const scrollRef = useRef<HTMLDivElement>(null)
  const contextRef = useRef(context)
  contextRef.current = context

  if (activeKey !== contextKey) {
    setActiveKey(contextKey)
    setStarted(autoStart)
    setMessages([])
    setLoading(false)
    setInput("")
  }

  useEffect(() => {
    if (!started) return
    const snapshot = contextRef.current
    const controller = new AbortController()
    setMessages([])
    setLoading(true)
    void readNotesExplainStream({ ...snapshot, messages: [] }, controller.signal, (full) => {
      setMessages([{ role: "model", content: full }])
    })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        if (err instanceof DOMException && err.name === "AbortError") return
        setMessages([{ role: "model", content: buildLocalNoteHelp(snapshot) }])
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => {
      controller.abort()
    }
  }, [started, activeKey])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages, loading])

  const handleSend = () => {
    const trimmed = input.trim()
    if (!trimmed || loading || !started) return
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: trimmed }]
    setMessages(nextMessages)
    setInput("")
    setLoading(true)
    const controller = new AbortController()
    void readNotesExplainStream(
      { ...contextRef.current, messages: nextMessages },
      controller.signal,
      (full) => {
        setMessages([...nextMessages, { role: "model", content: full }])
      }
    )
      .catch(() => {
        setMessages((prev) => [
          ...prev,
          {
            role: "model",
            content: "I couldn’t reach the live coach just now. Re-read the card bullets and try asking again.",
          },
        ])
      })
      .finally(() => setLoading(false))
  }

  return (
    <div className={cn("gnps-notes-edbot", className)} aria-label="Ask EdBot about this note">
      <div className="gnps-notes-edbot-head">
        <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
        <div className="min-w-0 flex-1">
          <p>Ask EdBot</p>
          <h4 className="truncate">About this note</h4>
        </div>
      </div>
      <p className="gnps-notes-edbot-card-label">
        <Bot className="inline h-3.5 w-3.5" aria-hidden /> {context.noteTitle}
      </p>

      {!started ? (
        <div className="gnps-notes-edbot-idle">
          <p>Want a deeper explanation of this card? Tap below when you are ready.</p>
          <button
            type="button"
            className="gnps-notes-edbot-ask-btn"
            onClick={() => setStarted(true)}
          >
            <Sparkles className="h-4 w-4" aria-hidden />
            Ask more about this note
          </button>
        </div>
      ) : (
        <>
          <div ref={scrollRef} className="gnps-notes-edbot-thread">
            {loading && messages.length === 0 ? (
              <div className="gnps-notes-edbot-bubble is-loading">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Thinking…
              </div>
            ) : null}
            {messages.map((msg, idx) => (
              <div
                key={`${msg.role}-${idx}`}
                className={cn("gnps-notes-edbot-bubble", msg.role === "user" ? "is-user" : "is-bot")}
              >
                {msg.role === "model" ? (
                  <div className="gnps-notes-edbot-copy">
                    <CoachRichText content={msg.content} />
                  </div>
                ) : (
                  msg.content
                )}
              </div>
            ))}
            {loading && messages.length > 0 && messages[messages.length - 1]?.role === "user" ? (
              <div className="gnps-notes-edbot-bubble is-loading">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Thinking…
              </div>
            ) : null}
          </div>
          <div className="gnps-notes-edbot-compose">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder="Ask a follow-up…"
              disabled={loading}
            />
            <button type="button" onClick={handleSend} disabled={loading || !input.trim()} aria-label="Send">
              <Send className="h-4 w-4" />
            </button>
          </div>
        </>
      )}
    </div>
  )
}
