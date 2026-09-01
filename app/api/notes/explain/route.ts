import { NextRequest } from "next/server"
import { GoogleGenAI } from "@google/genai"

const NOTES_MODEL = "gemini-2.5-flash-lite"
const SSE_HEADERS = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
}

type NotesExplainBody = {
  noteTitle?: string
  noteKind?: string
  noteBody?: string
  noteBullets?: string[]
  sectionTitle?: string
  levelTitle?: string
  courseName?: string
  messages?: { role: string; content: string }[]
}

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ success: false, error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

function sseChunk(payload: Record<string, unknown>) {
  return `data: ${JSON.stringify(payload)}\n\n`
}

/**
 * POST /api/notes/explain
 * Streams EdBot coaching for a GNPS learning-note card.
 */
export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return jsonError("AI explanation is not configured. Please add GEMINI_API_KEY.", 503)
  }

  let body: NotesExplainBody
  try {
    body = await request.json()
  } catch {
    return jsonError("Invalid JSON body", 400)
  }

  const {
    noteTitle,
    noteKind = "concept",
    noteBody = "",
    noteBullets = [],
    sectionTitle = "",
    levelTitle = "",
    courseName = "",
    messages = [],
  } = body

  if (!noteTitle) {
    return jsonError("Missing required field: noteTitle", 400)
  }

  const trimmedBody =
    noteBody.length > 360 ? `${noteBody.slice(0, 360).trimEnd()}…` : noteBody
  const bulletLines = noteBullets
    .slice(0, 5)
    .map((b) => `  - ${b}`)
    .join("\n")

  const systemInstruction = `You are EdBot, a supportive learning coach helping a student understand a study-note card.
Explain the note in plain language, connect it to one practical workplace action, and give 2–3 ways to remember it.
Keep the first reply to 70–110 words. Do not invent facts that contradict the note.
Format with short paragraphs, **bold** for key terms, and end with a short markdown bullet list of study tips.

Note context:
- Course: ${courseName || "Learning unit"}
- Level: ${levelTitle || "N/A"}
- Section: ${sectionTitle || "N/A"}
- Card kind: ${noteKind}
- Card title: ${noteTitle}
- Card body: ${trimmedBody || "(none)"}
- Key points:
${bulletLines || "  - (none)"}`

  const contents: { role: "user" | "model"; parts: { text: string }[] }[] = []
  const initialUserPrompt =
    "Help me understand this learning note more deeply and how to apply it in practice."

  if (messages.length === 0) {
    contents.push({ role: "user", parts: [{ text: initialUserPrompt }] })
  } else {
    if (messages[0]?.role === "model") {
      contents.push({ role: "user", parts: [{ text: initialUserPrompt }] })
    }
    for (const msg of messages) {
      const role = msg.role === "model" ? "model" : "user"
      contents.push({ role, parts: [{ text: msg.content }] })
    }
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(sseChunk(payload)))
      }
      try {
        const ai = new GoogleGenAI({ apiKey })
        const result = await ai.models.generateContentStream({
          model: NOTES_MODEL,
          contents,
          config: {
            systemInstruction,
            maxOutputTokens: 280,
            temperature: 0.4,
          },
        })
        for await (const chunk of result) {
          const text = chunk.text
          if (text) send({ text })
        }
        send({ done: true })
      } catch (err: unknown) {
        console.error("Notes explain error:", err)
        send({
          error: err instanceof Error ? err.message : "Failed to generate explanation",
        })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, { headers: SSE_HEADERS })
}
