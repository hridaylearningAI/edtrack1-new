#!/usr/bin/env node
/**
 * Parse case study .txt files (from quizes/case_study/) into Markdown for case-study.md.
 *
 * Expected format per .txt:
 *   Optional blank lines
 *   Title line (e.g. "ETBUS005 - Lead Communication in the Workplace")
 *   "Real Life Story time"
 *   Blank line
 *   Narrative paragraphs...
 *   "Closing Reflection"
 *   Blank line
 *   Reflection paragraph(s)
 *   "Thinking Questions for Learners"
 *   Blank line (optional)
 *   • Question one
 *   • Question two   (or 1. 2. 3. numbered)
 *
 * Usage:
 *   node scripts/parse-case-study-from-txt.mjs quizes/case_study/m6.txt
 *   node scripts/parse-case-study-from-txt.mjs quizes/case_study/m6.txt -o output/m6.md
 *   node scripts/parse-case-study-from-txt.mjs quizes/case_study   # all .txt in dir, -o output_dir
 *
 * Output: Markdown suitable for case-study.md (one per course). Copy the desired .md to your
 * course content folder as case-study.md.
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, statSync } from "fs"
import { join, dirname, basename, extname, resolve } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, "..")

const args = process.argv.slice(2)
const inputPath = args.find((a) => !a.startsWith("-"))
const outIdx = args.indexOf("-o")
const outputPath = outIdx >= 0 ? args[outIdx + 1] : null

if (!inputPath) {
  console.error("Usage: node parse-case-study-from-txt.mjs <input.txt | input_dir> [-o output.md | output_dir]")
  process.exit(1)
}

const TITLE_RE = /^[A-Z0-9]+[A-Z0-9]*\s*-\s+.+$/  // e.g. ETBUS005 - Lead Communication...
const SECTION_STORY = "Real Life Story time"
const SECTION_REFLECTION = "Closing Reflection"
const SECTION_QUESTIONS = "Thinking Questions for Learners"
const BULLET_RE = /^[•\-\*]\s+(.+)$/
const NUMBERED_RE = /^\d+[.)]\s+(.+)$/

function parseCaseStudyTxt(raw) {
  const lines = raw.split(/\r?\n/).map((l) => l.trimEnd())
  let title = ""
  let storyParagraphs = []
  let reflectionParagraphs = []
  let questions = []

  let i = 0
  while (i < lines.length && !lines[i].trim()) i++
  if (i < lines.length && TITLE_RE.test(lines[i].trim())) {
    title = lines[i].trim()
    i++
  }

  const findSection = (name) => {
    while (i < lines.length) {
      if (lines[i].trim() === name) {
        i++
        return true
      }
      i++
    }
    return false
  }

  const collectParagraphsUntil = (stopPredicate) => {
    const paras = []
    let current = []
    while (i < lines.length) {
      const line = lines[i]
      const trimmed = line.trim()
      if (stopPredicate(trimmed)) break
      if (!trimmed) {
        if (current.length) {
          paras.push(current.join(" ").trim())
          current = []
        }
        i++
        continue
      }
      if (BULLET_RE.test(trimmed) || NUMBERED_RE.test(trimmed)) break
      current.push(trimmed)
      i++
    }
    if (current.length) paras.push(current.join(" ").trim())
    return paras
  }

  if (!findSection(SECTION_STORY)) {
    return { title, storyParagraphs, reflectionParagraphs, questions }
  }
  storyParagraphs = collectParagraphsUntil((t) => t === SECTION_REFLECTION)
  if (!findSection(SECTION_REFLECTION)) {
    return { title, storyParagraphs, reflectionParagraphs, questions }
  }
  reflectionParagraphs = collectParagraphsUntil((t) => t === SECTION_QUESTIONS)
  if (!findSection(SECTION_QUESTIONS)) {
    return { title, storyParagraphs, reflectionParagraphs, questions }
  }

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()
    if (!trimmed) {
      i++
      continue
    }
    const bullet = trimmed.match(BULLET_RE)
    const numbered = trimmed.match(NUMBERED_RE)
    if (bullet) {
      questions.push(bullet[1].trim())
    } else if (numbered) {
      questions.push(numbered[1].trim())
    } else if (questions.length > 0 && !trimmed.startsWith("#")) {
      questions.push(trimmed)
    }
    i++
  }

  return { title, storyParagraphs, reflectionParagraphs, questions }
}

function toMarkdown(parsed) {
  const out = []
  if (parsed.title) {
    out.push("# " + parsed.title)
    out.push("")
  }
  out.push("## " + SECTION_STORY)
  out.push("")
  for (const p of parsed.storyParagraphs) {
    if (p) {
      out.push(p)
      out.push("")
    }
  }
  out.push("## " + SECTION_REFLECTION)
  out.push("")
  for (const p of parsed.reflectionParagraphs) {
    if (p) {
      out.push(p)
      out.push("")
    }
  }
  out.push("## " + SECTION_QUESTIONS)
  out.push("")
  for (const q of parsed.questions) {
    if (q) out.push("- " + q)
  }
  if (parsed.questions.length) out.push("")
  return out.join("\n").replace(/\n{3,}/g, "\n\n")
}

function processFile(absInputPath, absOutputPath) {
  if (!existsSync(absInputPath)) {
    console.error("File not found:", absInputPath)
    return false
  }
  const raw = readFileSync(absInputPath, "utf-8")
  const parsed = parseCaseStudyTxt(raw)
  const md = toMarkdown(parsed)
  const absOut = absOutputPath || absInputPath.replace(/\.txt$/i, ".md")
  const outDir = dirname(absOut)
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })
  writeFileSync(absOut, md, "utf-8")
  console.log("Wrote", absOut)
  return true
}

function main() {
  const resolvedInput = resolve(root, inputPath)
  if (!existsSync(resolvedInput)) {
    console.error("Not found:", resolvedInput)
    process.exit(1)
  }

  const stat = statSync(resolvedInput)
  if (stat.isDirectory()) {
    const files = readdirSync(resolvedInput)
      .filter((f) => f.toLowerCase().endsWith(".txt"))
      .sort()
    const outDir = outputPath ? resolve(root, outputPath) : join(dirname(resolvedInput), "case_study_output")
    for (const f of files) {
      const base = basename(f, extname(f))
      const absIn = join(resolvedInput, f)
      const absOut = join(outDir, base + ".md")
      processFile(absIn, absOut)
    }
    return
  }

  const absOut = outputPath ? resolve(root, outputPath) : null
  processFile(resolvedInput, absOut)
}

main()
