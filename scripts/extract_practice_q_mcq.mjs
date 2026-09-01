#!/usr/bin/env node
/**
 * Extract interactive MCQs from NCLEX Practice Q slide images via Gemini or Ollama vision.
 *
 * Practice Q slides typically alternate: Question slide → Answer & Explanation slide
 * (after an optional title slide). Options on question slides are often numbered 1–4;
 * answer slides use letters A–D.
 *
 * Usage:
 *   # Local Ollama (recommended for bulk; needs a vision model e.g. qwen2.5vl:3b)
 *   node scripts/extract_practice_q_mcq.mjs --provider ollama
 *   node scripts/extract_practice_q_mcq.mjs --provider ollama --model qwen2.5vl:3b --folder "Topic 1.4"
 *   # Lightweight fallback: ollama pull moondream (weaker OCR)
 *
 *   # Gemini cloud
 *   node scripts/extract_practice_q_mcq.mjs --provider gemini
 *   node scripts/extract_practice_q_mcq.mjs --folder "Topic 1.1" --limit-folders 2
 *
 * Env:
 *   GEMINI_API_KEY (required only for --provider gemini)
 *   OLLAMA_HOST (optional, default http://127.0.0.1:11434)
 *   NEXT_PUBLIC_H5P_CONTENT_BASE_URL (optional CDN base default)
 *
 * Output (default): data/practice-q-mcq-45.json
 * Checkpoint: tmp/practice-q-mcq-checkpoint.json
 */

import { GoogleGenAI } from "@google/genai"
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  createWriteStream,
} from "fs"
import { dirname, join } from "path"
import { fileURLToPath } from "url"
import { spawnSync } from "child_process"
import { pipeline } from "stream/promises"
import { Readable } from "stream"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, "..")

function loadEnvFile(path) {
  if (!existsSync(path)) return
  const text = readFileSync(path, "utf8")
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith("#")) continue
    const eq = t.indexOf("=")
    if (eq < 1) continue
    const key = t.slice(0, eq).trim()
    let val = t.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    if (!(key in process.env)) process.env[key] = val
  }
}

loadEnvFile(join(ROOT, ".env.local"))
loadEnvFile(join(ROOT, ".env"))

const args = process.argv.slice(2)
function argValue(flag, fallback = null) {
  const i = args.indexOf(flag)
  if (i >= 0 && args[i + 1]) return args[i + 1]
  return fallback
}
function hasFlag(flag) {
  return args.includes(flag)
}

const PROVIDER = (argValue("--provider") || process.env.PRACTICE_Q_MCQ_PROVIDER || "ollama")
  .trim()
  .toLowerCase()
const CDN_BASE = (
  argValue("--cdn-base") ||
  process.env.NEXT_PUBLIC_H5P_CONTENT_BASE_URL ||
  "https://d1yyshitp0zb6s.cloudfront.net/test"
).replace(/\/$/, "")
const CONTENT_FOLDER = argValue("--content-folder", "NCLEX")
const OUT_PATH = argValue("-o", join(ROOT, "data", "practice-q-mcq-45.json"))
const CHECKPOINT_PATH = argValue(
  "--checkpoint",
  join(ROOT, "tmp", "practice-q-mcq-checkpoint.json")
)
const CACHE_DIR = join(ROOT, "tmp", "practice-q-cache")
const ONLY_FOLDER = argValue("--folder")
const LIMIT_FOLDERS = argValue("--limit-folders")
  ? parseInt(argValue("--limit-folders"), 10)
  : null
const PAIRS_PER_CALL = Math.max(
  1,
  parseInt(argValue("--pairs-per-call", PROVIDER === "ollama" ? "1" : "3"), 10) || 1
)
const DEFAULT_MODEL = PROVIDER === "ollama" ? "qwen2.5vl:3b" : "gemini-2.5-flash-lite"
const MODEL = argValue("--model", DEFAULT_MODEL)
const CONCURRENCY = Math.max(1, parseInt(argValue("--concurrency", "1"), 10) || 1)
const DELAY_MS = Math.max(
  0,
  parseInt(argValue("--delay-ms", PROVIDER === "ollama" ? "200" : "1500"), 10) || 0
)
const OLLAMA_HOST = (
  argValue("--ollama-host") ||
  process.env.OLLAMA_HOST ||
  "http://127.0.0.1:11434"
).replace(/\/$/, "")
const OLLAMA_TIMEOUT_MS = Math.max(
  30_000,
  parseInt(argValue("--ollama-timeout-ms", "180000"), 10) || 180_000
)
const VISION_WIDTH = Math.max(
  480,
  parseInt(argValue("--vision-width", PROVIDER === "ollama" ? "900" : "1200"), 10) || 900
)

const LETTERS = ["A", "B", "C", "D", "E"]

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function encodePath(rel) {
  return rel
    .split("/")
    .map((s) => encodeURIComponent(s))
    .join("/")
}

function practiceQFolderToPageId(folderName) {
  const t = folderName.trim()
  const withSub = t.match(/^Topic\s*(\d+)\.(\d+)$/i)
  if (withSub) {
    return `topic-${parseInt(withSub[1], 10)}-practice-q-${parseInt(withSub[2], 10)}`
  }
  const noSub = t.match(/^Topic\s*(\d+)$/i)
  if (noSub) {
    return `topic-${parseInt(noSub[1], 10)}-practice-q-1`
  }
  return null
}

async function fetchJson(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`)
  return res.json()
}

async function downloadFile(url, destPath) {
  if (existsSync(destPath)) return destPath
  mkdirSync(dirname(destPath), { recursive: true })
  const res = await fetch(url)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`)
  await pipeline(Readable.fromWeb(res.body), createWriteStream(destPath))
  return destPath
}

function parseRetryDelayMs(errMessage) {
  const m = String(errMessage).match(/retry in ([\d.]+)s/i)
  if (m) return Math.ceil(parseFloat(m[1]) * 1000) + 1000
  return null
}

function slideNameCandidates(slide) {
  const names = [slide]
  const m = slide.match(/^(\d+)(\.[^.]+)$/i)
  if (m) {
    const n = parseInt(m[1], 10)
    const ext = m[2]
    names.push(`${n}${ext}`)
    names.push(String(n).padStart(2, "0") + ext)
    names.push(String(n).padStart(3, "0") + ext)
  }
  return [...new Set(names)]
}

async function downloadSlide(folder, slide) {
  const destDir = join(CACHE_DIR, folder.replace(/\s+/g, "_"))
  mkdirSync(destDir, { recursive: true })
  for (const candidate of slideNameCandidates(slide)) {
    const dest = join(destDir, candidate)
    if (existsSync(dest)) return { name: slide, path: dest, resolvedName: candidate }
    const url = `${CDN_BASE}/${encodePath(`${CONTENT_FOLDER}/Practice Q/${folder}/${candidate}`)}`
    const path = await downloadFile(url, dest)
    if (path) return { name: slide, path, resolvedName: candidate }
  }
  return null
}

/** Resize/compress with macOS sips → JPEG for cheaper vision uploads. */
function prepareImageForVision(pngPath) {
  const suffix = PROVIDER === "ollama" ? `.ollama${VISION_WIDTH}.jpg` : ".gemini.jpg"
  const jpgPath = pngPath.replace(/\.png$/i, suffix)
  if (existsSync(jpgPath) && existsSync(pngPath)) {
    try {
      const jpg = readFileSync(jpgPath)
      if (jpg.length > 1000) return jpgPath
    } catch {
      /* regenerate */
    }
  }
  const tmp = `${jpgPath}.tmp.jpg`
  const copy = spawnSync("sips", ["-s", "format", "jpeg", pngPath, "--out", tmp], {
    encoding: "utf8",
  })
  if (copy.status !== 0) {
    // Fallback: send original PNG
    return pngPath
  }
  const resize = spawnSync(
    "sips",
    ["--resampleWidth", String(VISION_WIDTH), tmp, "--out", jpgPath],
    { encoding: "utf8" }
  )
  if (resize.status !== 0) {
    spawnSync("mv", [tmp, jpgPath])
  } else if (existsSync(tmp)) {
    try {
      spawnSync("rm", ["-f", tmp])
    } catch {
      /* ignore */
    }
  }
  return existsSync(jpgPath) ? jpgPath : pngPath
}

function mimeFor(path) {
  if (/\.jpe?g$/i.test(path)) return "image/jpeg"
  if (/\.webp$/i.test(path)) return "image/webp"
  return "image/png"
}

function loadCheckpoint() {
  if (!existsSync(CHECKPOINT_PATH)) return { folders: {} }
  try {
    return JSON.parse(readFileSync(CHECKPOINT_PATH, "utf8"))
  } catch {
    return { folders: {} }
  }
}

function saveCheckpoint(cp) {
  mkdirSync(dirname(CHECKPOINT_PATH), { recursive: true })
  writeFileSync(CHECKPOINT_PATH, JSON.stringify(cp, null, 2))
}

function normalizeExtractedQuestion(raw, index) {
  if (!raw || typeof raw !== "object") return null
  const question = typeof raw.question === "string" ? raw.question.trim() : ""
  if (!question) return null
  const options = Array.isArray(raw.options)
    ? raw.options
        .map((o) => {
          if (!o || typeof o !== "object") return null
          let letter = typeof o.letter === "string" ? o.letter.trim().toUpperCase() : ""
          // Map numeric option labels 1–5 → A–E
          if (/^[1-5]$/.test(letter)) {
            letter = LETTERS[parseInt(letter, 10) - 1]
          }
          const text = typeof o.text === "string" ? o.text.trim() : ""
          if (!LETTERS.includes(letter) || !text) return null
          return { letter, text }
        })
        .filter(Boolean)
    : []
  if (options.length < 2) return null

  let correctLetter =
    typeof raw.correctLetter === "string" ? raw.correctLetter.trim().toUpperCase() : ""
  if (/^[1-5]$/.test(correctLetter)) {
    correctLetter = LETTERS[parseInt(correctLetter, 10) - 1]
  }
  if (!LETTERS.includes(correctLetter)) return null
  if (!options.some((o) => o.letter === correctLetter)) return null

  return {
    number: index + 1,
    question,
    options,
    correctLetter,
    rationale:
      typeof raw.rationale === "string" && raw.rationale.trim()
        ? raw.rationale.trim()
        : undefined,
    difficulty:
      raw.difficulty === "easy" || raw.difficulty === "moderate" || raw.difficulty === "hard"
        ? raw.difficulty
        : "moderate",
  }
}

function buildPairs(slides) {
  // Skip leading title/decorative slides until we see a likely question/answer sequence.
  // Heuristic: start at index 0; if odd count of remaining after skip of 1, skip first.
  const start = slides.length >= 3 ? 1 : 0 // first slide is usually the module title
  const pairs = []
  for (let i = start; i + 1 < slides.length; i += 2) {
    pairs.push({
      questionSlide: slides[i],
      answerSlide: slides[i + 1],
      pairIndex: pairs.length,
    })
  }
  return pairs
}

const SYSTEM = `You extract NCLEX-style multiple-choice questions from Practice Q presentation slides.
Each item is usually a QUESTION slide followed by an ANSWER & EXPLANATION slide.
Question slides often list options as 1/2/3/4 (map to A/B/C/D). Answer slides show "Correct Answer: X" and rationale.
Return ONLY valid JSON matching the schema. Do not invent answers — if the answer slide is unclear, set needsReview true and omit that item or leave correctLetter only when clearly stated.
Skip title/decorative slides that have no MCQ.`

function buildUserPrompt(folder, batchMeta) {
  return `Folder: ${folder}
Extract MCQs from these labeled slide pairs. Each pair is [questionSlide, answerSlide].

Pairs:
${batchMeta.map((p, i) => `${i + 1}. question=${p.questionSlide} answer=${p.answerSlide}`).join("\n")}

Respond with JSON:
{
  "questions": [
    {
      "sourcePair": 1,
      "question": "stem text",
      "options": [{"letter":"A","text":"..."},{"letter":"B","text":"..."},{"letter":"C","text":"..."},{"letter":"D","text":"..."}],
      "correctLetter": "B",
      "rationale": "short explanation from the answer slide",
      "difficulty": "easy|moderate|hard",
      "needsReview": false
    }
  ],
  "skipped": ["optional notes"]
}`
}

async function parseModelJson(raw, folder, provider) {
  const text = (raw || "").trim()
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    const m = text.match(/\{[\s\S]*\}/)
    if (!m) {
      throw new Error(`Non-JSON ${provider} response for ${folder}: ${text.slice(0, 200)}`)
    }
    parsed = JSON.parse(m[0])
  }
  return Array.isArray(parsed.questions) ? parsed.questions : []
}

async function extractBatchGemini(ai, folder, batch) {
  const parts = [{ text: buildUserPrompt(folder, batch) }]
  for (const pair of batch) {
    for (const label of ["question", "answer"]) {
      const slide = label === "question" ? pair.questionSlidePath : pair.answerSlidePath
      const prepared = prepareImageForVision(slide)
      const bytes = readFileSync(prepared)
      parts.push({
        text: `\n--- ${label} slide: ${label === "question" ? pair.questionSlide : pair.answerSlide} ---`,
      })
      parts.push({
        inlineData: {
          mimeType: mimeFor(prepared),
          data: bytes.toString("base64"),
        },
      })
    }
  }

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts }],
    config: {
      systemInstruction: SYSTEM,
      responseMimeType: "application/json",
      temperature: 0.1,
    },
  })

  return parseModelJson(response.text, folder, "gemini")
}

async function extractBatchOllama(folder, batch) {
  const images = []
  const labels = []
  for (const pair of batch) {
    for (const label of ["question", "answer"]) {
      const slidePath = label === "question" ? pair.questionSlidePath : pair.answerSlidePath
      const slideName = label === "question" ? pair.questionSlide : pair.answerSlide
      const prepared = prepareImageForVision(slidePath)
      images.push(readFileSync(prepared).toString("base64"))
      labels.push(`${label}=${slideName}`)
    }
  }

  const content = `${SYSTEM}

${buildUserPrompt(folder, batch)}

Image order (base64 attachments follow this sequence):
${labels.map((l, i) => `${i + 1}. ${l}`).join("\n")}

Return JSON only.`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS)
  let res
  try {
    res = await fetch(`${OLLAMA_HOST}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: MODEL,
        stream: false,
        format: "json",
        options: {
          temperature: 0.1,
          num_predict: 1200,
        },
        messages: [
          {
            role: "user",
            content,
            images,
          },
        ],
      }),
    })
  } catch (err) {
    if (err?.name === "AbortError") {
      throw new Error(
        `Ollama timed out after ${Math.round(OLLAMA_TIMEOUT_MS / 1000)}s on ${folder} (${labels.join(", ")})`
      )
    }
    throw err
  } finally {
    clearTimeout(timer)
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => "")
    throw new Error(`Ollama ${res.status}: ${errText.slice(0, 300)}`)
  }
  const data = await res.json()
  const raw = data?.message?.content ?? data?.response ?? ""
  return parseModelJson(raw, folder, "ollama")
}

async function extractBatch(ai, folder, batch) {
  if (PROVIDER === "ollama") return extractBatchOllama(folder, batch)
  if (PROVIDER === "gemini") return extractBatchGemini(ai, folder, batch)
  throw new Error(`Unknown provider: ${PROVIDER} (use ollama or gemini)`)
}

async function mapPool(items, concurrency, fn) {
  const results = new Array(items.length)
  let next = 0
  async function worker() {
    while (true) {
      const i = next++
      if (i >= items.length) return
      results[i] = await fn(items[i], i)
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()))
  return results
}

async function main() {
  if (PROVIDER !== "ollama" && PROVIDER !== "gemini") {
    console.error(`Unknown --provider ${PROVIDER}. Use ollama or gemini.`)
    process.exit(1)
  }

  let ai = null
  if (PROVIDER === "gemini") {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      console.error("GEMINI_API_KEY is required for --provider gemini")
      process.exit(1)
    }
    ai = new GoogleGenAI({ apiKey })
  } else {
    try {
      const ping = await fetch(`${OLLAMA_HOST}/api/tags`)
      if (!ping.ok) throw new Error(`HTTP ${ping.status}`)
      const tags = await ping.json()
      const names = (tags.models || []).map((m) => m.name)
      if (!names.some((n) => n === MODEL || n.startsWith(`${MODEL}:`) || n.startsWith(`${MODEL.split(":")[0]}:`))) {
        console.warn(
          `Model "${MODEL}" not found in ollama list (${names.join(", ") || "none"}). ` +
            `Run: ollama pull ${MODEL}`
        )
      }
    } catch (err) {
      console.error(
        `Cannot reach Ollama at ${OLLAMA_HOST}. Is \`ollama serve\` running?\n` +
          `${err instanceof Error ? err.message : err}`
      )
      process.exit(1)
    }
  }

  console.log(`Provider: ${PROVIDER} | model: ${MODEL} | pairs/call: ${PAIRS_PER_CALL}`)

  const manifestUrl = `${CDN_BASE}/${encodePath(`${CONTENT_FOLDER}/practice-q.json`)}`
  console.log(`Manifest: ${manifestUrl}`)
  const manifest = await fetchJson(manifestUrl)
  let folders = Array.isArray(manifest.folders) ? manifest.folders : []
  if (ONLY_FOLDER) {
    folders = folders.filter((f) => f.folder === ONLY_FOLDER)
  }
  if (LIMIT_FOLDERS != null && Number.isFinite(LIMIT_FOLDERS)) {
    folders = folders.slice(0, LIMIT_FOLDERS)
  }
  console.log(`Folders to process: ${folders.length}`)

  mkdirSync(CACHE_DIR, { recursive: true })
  const checkpoint = loadCheckpoint()

  for (const entry of folders) {
    try {
    const folder = entry.folder
    const pageId = practiceQFolderToPageId(folder)
    if (!pageId) {
      console.warn(`Skip unparseable folder: ${folder}`)
      continue
    }
    if (checkpoint.folders?.[folder]?.questions?.length && !hasFlag("--force")) {
      console.log(`✓ checkpoint hit: ${folder} (${checkpoint.folders[folder].questions.length} Qs)`)
      continue
    }

    const slides = Array.isArray(entry.slides) ? entry.slides : []
    console.log(`\n→ ${folder} (${slides.length} slides) → ${pageId}`)

    const localSlides = []
    for (const slide of slides) {
      try {
        const got = await downloadSlide(folder, slide)
        if (!got) {
          console.warn(`  skip missing slide: ${slide}`)
          continue
        }
        localSlides.push({ name: slide, path: got.path })
      } catch (err) {
        console.warn(`  skip slide ${slide}: ${err instanceof Error ? err.message : err}`)
      }
    }
    if (localSlides.length < 2) {
      console.warn(`  not enough slides for ${folder}; skipping`)
      continue
    }

    const pairs = buildPairs(localSlides.map((s) => s.name)).map((p) => {
      const q = localSlides.find((s) => s.name === p.questionSlide)
      const a = localSlides.find((s) => s.name === p.answerSlide)
      return {
        ...p,
        questionSlidePath: q?.path,
        answerSlidePath: a?.path,
      }
    }).filter((p) => p.questionSlidePath && p.answerSlidePath)

    if (pairs.length === 0) {
      console.warn(`  no Q/A pairs for ${folder}; skipping`)
      continue
    }

    const batches = []
    for (let i = 0; i < pairs.length; i += PAIRS_PER_CALL) {
      batches.push(pairs.slice(i, i + PAIRS_PER_CALL))
    }

    const batchResults = await mapPool(batches, CONCURRENCY, async (batch, bi) => {
      await sleep(DELAY_MS * bi)
      let attempt = 0
      while (true) {
        attempt++
        try {
          console.log(`  batch ${bi + 1}/${batches.length} (${batch.length} pairs)…`)
          const qs = await extractBatch(ai, folder, batch)
          return qs
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          console.warn(`  batch ${bi + 1} failed (attempt ${attempt}): ${msg.slice(0, 240)}`)
          const retryMs = parseRetryDelayMs(msg)
          if (retryMs && attempt < 6) {
            console.warn(`  waiting ${Math.round(retryMs / 1000)}s for rate limit…`)
            await sleep(retryMs)
            continue
          }
          if (attempt >= 5) return []
          await sleep(2000 * attempt)
        }
      }
    })

    const extracted = []
    let needsReview = false
    for (const qs of batchResults) {
      for (const raw of qs) {
        if (raw?.needsReview) needsReview = true
        const n = normalizeExtractedQuestion(raw, extracted.length)
        if (n) extracted.push(n)
      }
    }

    checkpoint.folders = checkpoint.folders || {}
    checkpoint.folders[folder] = {
      folder,
      pageId,
      questions: extracted,
      needsReview,
      extractedAt: new Date().toISOString(),
    }
    saveCheckpoint(checkpoint)
    console.log(`  saved ${extracted.length} questions${needsReview ? " (needsReview)" : ""}`)
    } catch (err) {
      console.error(`Folder failed: ${entry.folder}:`, err instanceof Error ? err.message : err)
    }
  }

  // Assemble final bank from checkpoint (all folders, not only this run)
  const allFolderNames = (Array.isArray(manifest.folders) ? manifest.folders : []).map(
    (f) => f.folder
  )
  const outFolders = []
  for (const name of allFolderNames) {
    const hit = checkpoint.folders?.[name]
    if (hit?.questions?.length) {
      outFolders.push({
        folder: hit.folder,
        pageId: hit.pageId || practiceQFolderToPageId(hit.folder),
        questions: hit.questions,
        needsReview: !!hit.needsReview,
      })
    }
  }

  const bank = {
    title: "NCLEX Practice Q MCQs",
    code: "ETP-NCLEX-TP",
    source: `${CONTENT_FOLDER}/Practice Q (${PROVIDER} ${MODEL})`,
    generatedAt: new Date().toISOString(),
    folders: outFolders,
  }

  mkdirSync(dirname(OUT_PATH), { recursive: true })
  writeFileSync(OUT_PATH, JSON.stringify(bank, null, 2))
  const totalQs = outFolders.reduce((n, f) => n + f.questions.length, 0)
  console.log(`\nWrote ${OUT_PATH}`)
  console.log(`Folders with MCQs: ${outFolders.length}/${allFolderNames.length}, questions: ${totalQs}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
