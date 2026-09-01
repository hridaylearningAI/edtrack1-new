#!/usr/bin/env node
/**
 * Parse quiz text (pasted from Word) into structured JSON.
 *
 * Expected format:
 *   Title line
 *   Code line (e.g. BSBCRT511)
 *   Multiple Choice Questions
 *
 *   Topic 1. Topic title
 *   1.	Question text?
 *   a) Option A
 *   b) Option B
 *   c) Option C
 *   d) Option D
 *   Answer: b) Option text
 *
 *   2.	Next question...
 *
 * Usage:
 *   node scripts/parse-quiz-from-word.mjs path/to/quiz.txt
 *   node scripts/parse-quiz-from-word.mjs path/to/quiz.txt -o data/quiz.json
 *
 * Output: JSON to stdout or to file if -o is given.
 */

import { readFileSync, writeFileSync } from "fs"
import { fileURLToPath } from "url"
import { dirname, join } from "path"

const __dirname = dirname(fileURLToPath(import.meta.url))

const args = process.argv.slice(2)
const inputPath = args.find((a) => !a.startsWith("-"))
const outIdx = args.indexOf("-o")
const outputPath = outIdx >= 0 ? args[outIdx + 1] : null

if (!inputPath) {
  console.error("Usage: node parse-quiz-from-word.mjs <input.txt> [-o output.json]")
  process.exit(1)
}

const raw = readFileSync(inputPath, "utf-8")
const lines = raw.split(/\r?\n/).map((l) => l.trimEnd())

const TOPIC_RE = /^Topic\s+(\d+)[.:]\s*(.+)$/i
const QUESTION_RE = /^(\d+)\.\s+(.+)$/
const OPTION_RE = /^([a-d])\)\s*(.+)$/
const ANSWER_RE = /^Answer:\s*([a-d])\)\s*(.*)$/i

let title = ""
let code = ""
const topics = []
let currentTopic = null
let currentQuestion = null

function finishQuestion() {
  if (currentQuestion && currentTopic) {
    currentTopic.questions.push(currentQuestion)
    currentQuestion = null
  }
}

function finishTopic() {
  finishQuestion()
  if (currentTopic) {
    topics.push(currentTopic)
    currentTopic = null
  }
}

for (let i = 0; i < lines.length; i++) {
  const line = lines[i]
  if (!line) continue

  const topicMatch = line.match(TOPIC_RE)
  if (topicMatch) {
    finishTopic()
    currentTopic = {
      number: parseInt(topicMatch[1], 10),
      title: topicMatch[2].trim(),
      questions: [],
    }
    continue
  }

  const answerMatch = line.match(ANSWER_RE)
  if (answerMatch && currentQuestion) {
    currentQuestion.correctLetter = answerMatch[1].toUpperCase()
    finishQuestion()
    continue
  }

  const optionMatch = line.match(OPTION_RE)
  if (optionMatch && currentQuestion) {
    currentQuestion.options.push({
      letter: optionMatch[1].toUpperCase(),
      text: optionMatch[2].trim(),
    })
    continue
  }

  const questionMatch = line.match(QUESTION_RE)
  if (questionMatch && currentTopic) {
    finishQuestion()
    currentQuestion = {
      number: parseInt(questionMatch[1], 10),
      question: questionMatch[2].trim(),
      options: [],
      correctLetter: "A",
    }
    continue
  }

  // Title/code only before first Topic
  if (!currentTopic && topics.length === 0 && !line.match(TOPIC_RE)) {
    if (/^Multiple Choice Questions$/i.test(line)) continue
    if (!title) {
      title = line
    } else if (!code) {
      code = line
    }
  }
}

finishTopic()

// If we never found a Topic line, maybe the first line is the title and we have "Topic 1" elsewhere
if (topics.length === 0 && raw.includes("Topic")) {
  console.error("No topics parsed. Check that lines match 'Topic N. Title' and questions match 'N. Question text'")
}

const result = { title: title || "Quiz", code: code || undefined, topics }

const json = JSON.stringify(result, null, 2)

if (outputPath) {
  const abs = join(process.cwd(), outputPath)
  writeFileSync(abs, json, "utf-8")
  console.error("Wrote", abs)
} else {
  console.log(json)
}
