import { NextRequest, NextResponse } from "next/server"
import { GoogleGenAI } from "@google/genai"

/**
 * POST /api/quiz/analyze
 * EdBot coaching after a quiz attempt — uses score + label breakdown.
 */
export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: "AI analysis is not configured. Please add GEMINI_API_KEY." },
      { status: 503 }
    )
  }

  let body: {
    quizTitle?: string
    topicName?: string
    scorePercent?: number
    passed?: boolean
    passingPercent?: number
    correctCount?: number
    totalQuestions?: number
    bySection?: { label: string; correct: number; total: number; percent: number }[]
    byDifficulty?: { label: string; correct: number; total: number; percent: number }[]
    missed?: {
      number: number
      question: string
      sectionLabel?: string
      programArea?: string
      difficulty?: string
    }[]
    messages?: { role: string; content: string }[]
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 })
  }

  const {
    quizTitle,
    topicName,
    scorePercent = 0,
    passed = false,
    passingPercent = 70,
    correctCount = 0,
    totalQuestions = 0,
    bySection = [],
    byDifficulty = [],
    missed = [],
    messages = [],
  } = body

  if (totalQuestions <= 0) {
    return NextResponse.json(
      { success: false, error: "Missing required field: totalQuestions" },
      { status: 400 }
    )
  }

  const sectionLines = bySection
    .map((s) => `  - ${s.label}: ${s.correct}/${s.total} (${s.percent}%)`)
    .join("\n")
  const difficultyLines = byDifficulty
    .map((d) => `  - ${d.label}: ${d.correct}/${d.total} (${d.percent}%)`)
    .join("\n")
  const missedLines = missed
    .slice(0, 8)
    .map((m) => {
      const bits = [
        `Q${m.number}`,
        m.sectionLabel ? `section “${m.sectionLabel}”` : null,
        m.difficulty ? `difficulty ${m.difficulty}` : null,
      ].filter(Boolean)
      return `  - ${bits.join(" · ")}: ${m.question.slice(0, 160)}`
    })
    .join("\n")

  const systemInstruction = `You are EdBot, a supportive nursing tutor. A student just finished a knowledge-check quiz.
Give practical coaching so they score better next time. Be warm, specific, and concise (about 120–180 words).
Use the question-bank labels (program area / section / difficulty) when giving advice.
Do not invent clinical facts that contradict the missed-item stems. Prefer study tactics over long lectures.
End with 2–3 concrete next steps as a short bullet list.

Attempt summary:
- Quiz: ${quizTitle || "Knowledge check"}
- Topic: ${topicName || "N/A"}
- Score: ${correctCount}/${totalQuestions} (${scorePercent}%) — ${passed ? "PASSED" : "NOT YET PASSED"} (pass mark ${passingPercent}%)
- By section label:
${sectionLines || "  - n/a"}
- By difficulty:
${difficultyLines || "  - n/a"}
- Sample missed items:
${missedLines || "  - none"}`

  try {
    const ai = new GoogleGenAI({ apiKey })
    const contents: { role: "user" | "model"; parts: { text: string }[] }[] = []
    const initialUserPrompt =
      "Please analyse my quiz result and tell me how to improve for the next attempt."
    if (messages.length === 0) {
      contents.push({ role: "user", parts: [{ text: initialUserPrompt }] })
    } else {
      if (messages[0]?.role === "model") {
        contents.push({ role: "user", parts: [{ text: initialUserPrompt }] })
      }
      for (const m of messages) {
        contents.push({
          role: (m.role === "model" ? "model" : "user") as "user" | "model",
          parts: [{ text: m.content }],
        })
      }
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      config: { systemInstruction },
      contents,
    })

    const text =
      (response as { text?: string })?.text ??
      (response as { candidates?: { content?: { parts?: { text?: string }[] } }[] })?.candidates?.[0]
        ?.content?.parts?.[0]?.text ??
      ""

    if (!text) throw new Error("No response from AI")
    return NextResponse.json({ success: true, text })
  } catch (err) {
    console.error("[quiz/analyze] Error:", err)
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Failed to analyse attempt. Please try again.",
      },
      { status: 500 }
    )
  }
}
