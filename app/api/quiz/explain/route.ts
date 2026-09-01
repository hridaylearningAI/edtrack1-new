import { NextRequest, NextResponse } from "next/server"
import { GoogleGenAI } from "@google/genai"

/**
 * POST /api/quiz/explain
 * AI explanation for quiz questions (correct or incorrect).
 * Body: { question, userAnswerText, correctAnswerText, rationale?, wasCorrect?, messages?, quizContext? }
 */
export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: "AI explanation is not configured. Please add GEMINI_API_KEY." },
      { status: 503 }
    )
  }

  let body: {
    question?: string
    userAnswerText?: string
    correctAnswerText?: string
    rationale?: string
    wasCorrect?: boolean
    messages?: { role: string; content: string }[]
    quizContext?: { quizTitle?: string; topicName?: string }
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 }
    )
  }

  const {
    question,
    userAnswerText,
    correctAnswerText,
    rationale = "",
    wasCorrect = false,
    messages = [],
    quizContext = {},
  } = body

  if (!question || !userAnswerText || !correctAnswerText) {
    return NextResponse.json(
      { success: false, error: "Missing required fields: question, userAnswerText, correctAnswerText" },
      { status: 400 }
    )
  }

  const { quizTitle, topicName } = quizContext
  const contextParts: string[] = [
    `- Question: ${question}`,
    `- The student's answer: ${userAnswerText}`,
    `- Correct answer: ${correctAnswerText}`,
    `- Result: ${wasCorrect ? "CORRECT" : "INCORRECT"}`,
  ]
  if (rationale) contextParts.push(`- Official rationale: ${rationale}`)
  if (quizTitle) contextParts.push(`- Quiz: ${quizTitle}`)
  if (topicName) contextParts.push(`- Topic/Module: ${topicName}`)

  const systemInstruction = wasCorrect
    ? `You are EdBot, a supportive nursing tutor. The student answered this item correctly.
Context:
${contextParts.join("\n")}

Your role: Affirm the correct choice briefly, then reinforce the official rationale in plain language (do not contradict it). Add one practical tip for remembering this concept. Keep the first reply concise (about 80–140 words). Answer follow-ups helpfully.`
    : `You are EdBot, a supportive nursing tutor. The student selected an incorrect answer.
Context:
${contextParts.join("\n")}

Your role: Explain clearly why the student's answer was incorrect and why the correct answer is safer/right. Ground the explanation in the official rationale when provided — do not invent conflicting clinical facts. Keep the first reply concise (about 100–160 words). Answer follow-ups helpfully.`

  try {
    const ai = new GoogleGenAI({ apiKey })
    const contents: { role: "user" | "model"; parts: { text: string }[] }[] = []

    const initialUserPrompt = wasCorrect
      ? "I got this correct — help me lock in the rationale and why this answer is safest."
      : "Please explain why my answer was incorrect and help me understand the correct answer using the rationale."
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

    if (!text) {
      throw new Error("No response from AI")
    }

    return NextResponse.json({ success: true, text })
  } catch (err) {
    console.error("[quiz/explain] Error:", err)
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Failed to get explanation. Please try again.",
      },
      { status: 500 }
    )
  }
}
