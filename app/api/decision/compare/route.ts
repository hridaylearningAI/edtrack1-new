import { NextRequest, NextResponse } from "next/server"
import { GoogleGenAI } from "@google/genai"

type PromptCompare = {
  prompt: string
  studentAnswer: string
  modelAnswer: string
  percent: number
  note?: string
}

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2)
  )
}

function localSimilarityPercent(student: string, model: string): number {
  const a = tokenize(student)
  const b = tokenize(model)
  if (a.size === 0 || b.size === 0) return student.trim() ? 18 : 0
  let overlap = 0
  for (const token of a) {
    if (b.has(token)) overlap += 1
  }
  const union = new Set([...a, ...b]).size
  const jaccard = union > 0 ? overlap / union : 0
  // Soften extremes — free-text clinical answers rarely match word-for-word.
  const soft = 12 + jaccard * 78
  return Math.max(0, Math.min(96, Math.round(soft)))
}

function buildLocalFallback(args: {
  title: string
  prompts: string[]
  studentAnswers: string[]
  modelAnswers: string[]
  trap?: string
}): { overallPercent: number; perPrompt: PromptCompare[]; coaching: string } {
  const perPrompt: PromptCompare[] = args.prompts.map((prompt, idx) => {
    const studentAnswer = args.studentAnswers[idx] ?? ""
    const modelAnswer = args.modelAnswers[idx] ?? ""
    const percent = localSimilarityPercent(studentAnswer, modelAnswer)
    return {
      prompt,
      studentAnswer,
      modelAnswer,
      percent,
      note:
        percent >= 70
          ? "Strong alignment with the model response."
          : percent >= 45
            ? "Partly aligned — tighten the priority and safety language."
            : "Low overlap — compare your risk focus with the model answer.",
    }
  })
  const overallPercent =
    perPrompt.length > 0
      ? Math.round(perPrompt.reduce((sum, row) => sum + row.percent, 0) / perPrompt.length)
      : 0
  const weakest = [...perPrompt].sort((a, b) => a.percent - b.percent)[0]
  const coaching = [
    `You were about **${overallPercent}%** close to the safest model response for “${args.title}”.`,
    weakest
      ? `Biggest gap: **${weakest.prompt}** (${weakest.percent}%). Re-read the model wording and rewrite yours in one safer sentence.`
      : "",
    args.trap ? `Watch the trap: ${args.trap}` : "",
    "Next steps:",
    "* **Rewrite:** Restate your first action using ABC / safety-first language",
    "* **Compare:** Underline shared clinical ideas between your answer and the model",
    "* **Retake mindset:** Decide → justify risk → name one check next",
  ]
    .filter(Boolean)
    .join("\n")

  return { overallPercent, perPrompt, coaching }
}

/**
 * POST /api/decision/compare
 * Compare free-text decision answers to the model response and return closeness %.
 */
export async function POST(request: NextRequest) {
  let body: {
    title?: string
    scenario?: string
    prompts?: string[]
    studentAnswers?: string[]
    modelAnswers?: string[]
    trap?: string
    messages?: { role: string; content: string }[]
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 })
  }

  const {
    title = "Decision practice",
    scenario = "",
    prompts = [],
    studentAnswers = [],
    modelAnswers = [],
    trap = "",
    messages = [],
  } = body

  if (!Array.isArray(prompts) || prompts.length === 0) {
    return NextResponse.json({ success: false, error: "Missing prompts" }, { status: 400 })
  }

  const local = buildLocalFallback({
    title,
    prompts,
    studentAnswers,
    modelAnswers,
    trap,
  })

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ success: true, ...local, source: "local" })
  }

  const compareLines = prompts
    .map((prompt, idx) => {
      return [
        `Prompt ${idx + 1}: ${prompt}`,
        `Student: ${studentAnswers[idx]?.trim() || "(blank)"}`,
        `Model: ${modelAnswers[idx]?.trim() || "(blank)"}`,
      ].join("\n")
    })
    .join("\n\n")

  const systemInstruction = `You are EdBot, a supportive nursing tutor scoring how close a student's free-text decision answers are to a model clinical response.
Exact wording is NOT required. Score semantic / clinical closeness (safety priority, risk focus, next assessment).
Return ONLY valid JSON with this shape:
{
  "overallPercent": number (0-100),
  "perPrompt": [{"prompt": string, "percent": number, "note": string}],
  "coaching": string
}
coaching should be markdown-friendly (short paragraphs + 2-3 bullets). Mention the overall percent clearly.
Do not invent clinical facts that contradict the model answers.

Scenario title: ${title}
Scenario excerpt: ${scenario.slice(0, 500)}
Common trap: ${trap || "n/a"}

Comparisons:
${compareLines}`

  try {
    const ai = new GoogleGenAI({ apiKey })
    const contents: { role: "user" | "model"; parts: { text: string }[] }[] = []
    const initialUserPrompt =
      "Score how close my answers are to the model response and coach me on what to improve."

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

    // Follow-ups: return coaching text only in JSON wrapper for consistency.
    if (messages.length > 0) {
      const followUpInstruction = `${systemInstruction}

The student already saw their closeness score. Answer their follow-up helpfully in JSON:
{"overallPercent": ${local.overallPercent}, "perPrompt": [], "coaching": "markdown reply"}`

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents,
        config: {
          systemInstruction: followUpInstruction,
          responseMimeType: "application/json",
        },
      })
      const raw = response.text?.trim() ?? ""
      try {
        const parsed = JSON.parse(raw) as {
          overallPercent?: number
          coaching?: string
        }
        return NextResponse.json({
          success: true,
          overallPercent: local.overallPercent,
          perPrompt: local.perPrompt,
          coaching: parsed.coaching || raw || local.coaching,
          source: "gemini",
        })
      } catch {
        return NextResponse.json({
          success: true,
          overallPercent: local.overallPercent,
          perPrompt: local.perPrompt,
          coaching: raw || local.coaching,
          source: "gemini",
        })
      }
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
      },
    })

    const raw = response.text?.trim() ?? ""
    let parsed: {
      overallPercent?: number
      perPrompt?: { prompt?: string; percent?: number; note?: string }[]
      coaching?: string
    } = {}
    try {
      parsed = JSON.parse(raw) as typeof parsed
    } catch {
      return NextResponse.json({ success: true, ...local, source: "local" })
    }

    const perPrompt: PromptCompare[] = prompts.map((prompt, idx) => {
      const fromAi = parsed.perPrompt?.[idx]
      const percentRaw = typeof fromAi?.percent === "number" ? fromAi.percent : local.perPrompt[idx]?.percent ?? 0
      const percent = Math.max(0, Math.min(100, Math.round(percentRaw)))
      return {
        prompt,
        studentAnswer: studentAnswers[idx] ?? "",
        modelAnswer: modelAnswers[idx] ?? "",
        percent,
        note: fromAi?.note || local.perPrompt[idx]?.note,
      }
    })

    const overallRaw =
      typeof parsed.overallPercent === "number"
        ? parsed.overallPercent
        : perPrompt.reduce((sum, row) => sum + row.percent, 0) / Math.max(perPrompt.length, 1)
    const overallPercent = Math.max(0, Math.min(100, Math.round(overallRaw)))

    return NextResponse.json({
      success: true,
      overallPercent,
      perPrompt,
      coaching: parsed.coaching?.trim() || local.coaching,
      source: "gemini",
    })
  } catch (err: unknown) {
    console.error("Decision compare error:", err)
    return NextResponse.json({ success: true, ...local, source: "local" })
  }
}
