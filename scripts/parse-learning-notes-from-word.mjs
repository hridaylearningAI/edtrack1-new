#!/usr/bin/env node
/**
 * Parse Student Learning Notes text (pasted from Word) into structured JSON.
 *
 * Expected format:
 *   Line 1: courseCode (e.g. ETBUS001)
 *   Line 2: title (e.g. Developing Critical Thinking)
 *   Line 3: subtitle (e.g. Student Learning Notes)
 *   Blank line
 *   Section 1. Section title
 *   Paragraph text... (one or more lines, merged)
 *   - List item one
 *   - List item two
 *   Section 2. Next section title
 *   ...
 *   Subsection 4.1. Subsection title   (nested under current section)
 *   Paragraph text...
 *
 * Usage:
 *   node scripts/parse-learning-notes-from-word.mjs path/to/notes.txt
 *   node scripts/parse-learning-notes-from-word.mjs path/to/notes.txt -o data/student-learning-notes.json
 *
 * Output: JSON to stdout or to file if -o is given.
 */

import { readFileSync, writeFileSync } from "fs"
import { dirname, join } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))

const args = process.argv.slice(2)
const inputPath = args.find((a) => !a.startsWith("-"))
const outIdx = args.indexOf("-o")
const outputPath = outIdx >= 0 ? args[outIdx + 1] : null

if (!inputPath) {
  console.error("Usage: node parse-learning-notes-from-word.mjs <input.txt> [-o output.json]")
  process.exit(1)
}

const raw = readFileSync(inputPath, "utf-8")
const lines = raw.split(/\r?\n/).map((l) => l.trimEnd())

const SECTION_RE = /^Section\s+(\d+(?:\.\d+)?)\s*[.:]\s*(.*)$/i
const SUBSECTION_RE = /^Subsection\s+(\d+\.\d+)\s*[.:]\s*(.*)$/i
const LIST_ITEM_RE = /^[-•]\s+(.+)$/

let courseCode = ""
let title = ""
let subtitle = ""
const sections = []
let headerDone = false
let headerLines = 0

let currentSection = null
let currentSubsection = null
let currentContent = []
let currentParagraph = []
let currentList = null

function flushParagraph() {
  if (currentParagraph.length > 0) {
    const text = currentParagraph.join(" ").trim()
    if (text) currentContent.push({ type: "paragraph", text })
    currentParagraph = []
  }
}

function flushList() {
  if (currentList !== null) {
    currentContent.push({ type: "list", items: currentList })
    currentList = null
  }
}

function flushContent() {
  flushParagraph()
  flushList()
}

function pushSubsection() {
  flushContent()
  if (currentSubsection && currentContent.length > 0) {
    currentSubsection.content = [...currentContent]
    currentSection.content.push(currentSubsection)
  }
  currentContent = []
  currentSubsection = null
}

function pushSection() {
  if (!currentSection) return
  flushContent()
  const sectionContent = [...currentContent]
  pushSubsection()
  if (sectionContent.length > 0) {
    for (const block of sectionContent) currentSection.content.push(block)
  }
  if (currentSection.content.length > 0) {
    sections.push(currentSection)
  }
  currentSection = null
}

function startSection(number, sectionTitle) {
  pushSection()
  currentSection = {
    number: String(number),
    title: sectionTitle.trim() || "Untitled",
    content: [],
  }
  currentSubsection = null
  currentContent = []
}

function startSubsection(number, subsectionTitle) {
  flushContent()
  const sectionLevelContent = [...currentContent]
  pushSubsection()
  if (currentSection && sectionLevelContent.length > 0) {
    for (const block of sectionLevelContent) currentSection.content.push(block)
  }
  currentContent = []
  currentSubsection = {
    type: "subsection",
    number: String(number),
    title: subsectionTitle.trim() || "Untitled",
    content: [],
  }
}

for (let i = 0; i < lines.length; i++) {
  const line = lines[i]

  if (!line) {
    if (!headerDone) {
      if (headerLines >= 3) headerDone = true
    } else {
      flushParagraph()
      if (currentList !== null) {
        flushList()
      }
    }
    continue
  }

  if (!headerDone) {
    if (headerLines === 0) courseCode = line
    else if (headerLines === 1) title = line
    else if (headerLines === 2) subtitle = line
    headerLines++
    if (headerLines >= 3) headerDone = true
    continue
  }

  const sectionMatch = line.match(SECTION_RE)
  if (sectionMatch) {
    const num = sectionMatch[1]
    const sectionTitle = sectionMatch[2].trim() || (lines[i + 1] && !lines[i + 1].match(SECTION_RE) && !lines[i + 1].match(SUBSECTION_RE) ? lines[++i] : "")
    startSection(num, sectionTitle || "Untitled")
    continue
  }

  const subsectionMatch = line.match(SUBSECTION_RE)
  if (subsectionMatch) {
    const num = subsectionMatch[1]
    const subsectionTitle = subsectionMatch[2].trim() || (lines[i + 1] && !lines[i + 1].match(SECTION_RE) && !lines[i + 1].match(SUBSECTION_RE) ? lines[++i] : "")
    startSubsection(num, subsectionTitle || "Untitled")
    continue
  }

  const listMatch = line.match(LIST_ITEM_RE)
  if (listMatch) {
    flushParagraph()
    if (currentList === null) currentList = []
    currentList.push(listMatch[1].trim())
    continue
  }

  // Paragraph line
  flushList()
  currentParagraph.push(line)
}

pushSection()

const result = {
  courseCode: courseCode || "COURSE",
  title: title || "Learning Notes",
  subtitle: subtitle || "Student Learning Notes",
  sections,
}

const json = JSON.stringify(result, null, 2)

if (outputPath) {
  const abs = join(process.cwd(), outputPath)
  writeFileSync(abs, json, "utf-8")
  console.error("Wrote", abs)
} else {
  console.log(json)
}
