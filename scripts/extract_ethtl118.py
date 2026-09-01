#!/usr/bin/env python3
"""Extract GNPS Program 4 DOCX/PPTX content into ethtl118 JSON files."""

from __future__ import annotations

import html
import json
import re
from pathlib import Path
from typing import Any

from docx import Document
from pptx import Presentation
from pptx.enum.shapes import MSO_SHAPE_TYPE

SRC = Path(
    "/Users/hridaygoswami/Library/Mobile Documents/com~apple~CloudDocs/"
    "EdTec Project/2. EdTec.Online/3. Training Design/"
    "1. Training Programs - Phase I - Launch/"
    "EdTec.Online - Phase 1 Programs/"
    "Program Category 5 - TestPrep Programs/"
    "1. TestPrep - NCLEX -OSCE - Nursing /"
    "EdTec - NCLEX  - TestPrep Materials/"
    "EdTec GNPS and Programs/"
    "GNPS Program 4 - Caring for Adults I - Understanding Common Health Conditions"
)

OUT = Path(
    "/Users/hridaygoswami/Desktop/Everything/Baba_bhai/edtech/sms/"
    "edtec-student-management-system/data/gnps/ethtl118"
)

COURSE_CODE = "ETHTL118"
PROGRAM_TITLE = "Caring for Adults with Confidence"
PROGRAM_THEME = "Adult Medical-Surgical Nursing I"

LEVEL_META = [
    {
        "id": "level-1",
        "number": 1,
        "title": "Qualified Nurse",
        "blurb": "Assess adults with common medical–surgical conditions and deliver safe priority-based nursing care.",
        "pagePrefix": "gnps-l1",
        "folder": "GNPS Program 4 - Level 1 - Qualified Nurse",
        "notes": "GNPS Program 4 - Level 1 - Student Learning Note.docx",
        "quiz": "GNPS Program 4 - Level 1 - Question Bank with Labels and Rationales.docx",
        "overview_pptx": "GNPS Program 4 - Level 1 - Qualified Nurse - Presentation deck.pptx",
        "section_pptx": [
            "GNPS Program 4 - Level 1 - Section 1 Qualified Nurse - Presentation deck.pptx",
            "GNPS Program 4 - Level 1 - Section 2 Qualified Nurse - Presentation deck.pptx",
            "GNPS Program 4 - Level 1 - Section 3 Qualified Nurse - Presentation deck.pptx",
            "GNPS Program 4 - Level 1 - Section 4 Qualified Nurse - Presentation deck.pptx",
        ],
        "notes_title": "Level 1 – Qualified Nurse",
        # P4 notes omit "Section N:" headers; titles come from overview decks.
        "section_titles": [
            "Foundations of Adult Medical-Surgical Nursing",
            "Comprehensive Assessment & Clinical Reasoning",
            "Nursing Care for Common Medical Conditions",
            "Surgical Nursing & Prevention of Complications",
        ],
    },
    {
        "id": "level-2",
        "number": 2,
        "title": "International Qualified Nurse",
        "blurb": "Apply international adult med–surg standards with clinical judgment across complex presentations.",
        "pagePrefix": "gnps-l2",
        "folder": "GNPS Program 4 - Level 2 - International Qualified Nurse",
        "notes": "GNPS Program 4 - Level 2 - Student Learning Note.docx",
        "quiz": "GNPS Program 4 - Level 2 - Question Bank with Labels and Rationales.docx",
        "overview_pptx": "GNPS Program 4 - Level 2 - Internationaly Qualified Nurse - Presentation deck.pptx",
        "section_pptx": [
            "GNPS Program 4 - Level 2 - Section 1 International Qualified Nurse - Presentation deck.pptx",
            "GNPS Program 4 - Level 2 - Section 2 International Qualified Nurse - Presentation deck.pptx",
            "GNPS Program 4 - Level 2 - Section 3 International Qualified Nurse - Presentation deck.pptx",
            "GNPS Program 4 - Level 2 - Section 4 International Qualified Nurse - Presentation deck.pptx",
        ],
        "notes_title": "Level 2 – International Qualified Nurse",
        "section_titles": [
            "Advanced Assessment & Prioritisation in International Practice",
            "Managing Complex Medical & Perioperative Care",
            "Interdisciplinary Care, Documentation & Safe Transitions",
            "Person-Centred Education & Chronic Disease Self-Management",
        ],
    },
    {
        "id": "level-3",
        "number": 3,
        "title": "Global Nurse Professional",
        "blurb": "Lead adult care systems, quality improvement and global med–surg nursing excellence.",
        "pagePrefix": "gnps-l3",
        "folder": "GNPS Program 4 - Level 3 - Global Nurse Professional",
        "notes": "GNPS Program 4 - Level 3 - Student Learning Note.docx",
        "quiz": "GNPS Program 4 - Level 3 - Question Bank with Labels and Rationales.docx",
        "overview_pptx": "GNPS Program 4 - Level 3 - Global Nurse Professional - Presentation deck.pptx",
        "section_pptx": [
            "GNPS Program 4 - Level 3 - Section 1 - Global Nurse Professional - Presentation deck.pptx",
            "GNPS Program 4 - Level 3 - Section 2 - Global Nurse Professional - Presentation deck.pptx",
            "GNPS Program 4 - Level 3 - Section 3 - Global Nurse Professional - Presentation deck.pptx",
            "GNPS Program 4 - Level 3 - Section 4 - Global Nurse Professional - Presentation deck.pptx",
        ],
        "notes_title": "Level 3 – Global Nurse Professional",
        "section_titles": [
            "Leading Excellence in Adult Medical-Surgical Nursing",
            "Systems for Recognising & Responding to Deterioration",
            "Quality Improvement & Evidence Translation",
            "Digital Health, Integrated Care & Global Practice",
        ],
    },
]

CASE_STUDIES_DOC = (
    SRC
    / "GNPS Program 4 - Case studies MCQs and Practice Qs"
    / "GNPS Program 4 - Level 3 - NGN Upgrade.docx"
)
DECISION_DOC = (
    SRC
    / "GNPS Program 4 - Case studies MCQs and Practice Qs"
    / "GNPS Program 4 - Adult Medical–Surgical Nursing I - Decision Practice.docx"
)

HEADING_MARKERS = {
    "introduction",
    "learning outcomes",
    "core concepts",
    "clinical example",
    "key learning points",
    "what you will learn",
    "why this learning matters",
    "your learning goal",
    "remember...",
}


def clean(text: str) -> str:
    return html.unescape((text or "").replace("\xa0", " ").strip())


def paras(doc_path: Path) -> list[str]:
    doc = Document(str(doc_path))
    return [clean(p.text) for p in doc.paragraphs]


def is_bullet(line: str) -> bool:
    return bool(re.match(r"^[•\-\u2022]\s+", line) or re.match(r"^\d+\.\s+", line))


def strip_bullet(line: str) -> str:
    return re.sub(r"^[•\-\u2022]\s+", "", re.sub(r"^\d+\.\s+", "", line)).strip()


def looks_like_heading(line: str) -> bool:
    low = line.lower().rstrip(":")
    if low in HEADING_MARKERS:
        return True
    if re.match(r"^section\s+\d+", low):
        return True
    # Short title-case headings without trailing period
    if (
        len(line) <= 80
        and not line.endswith(".")
        and not is_bullet(line)
        and line[:1].isupper()
        and " " in line
        and line == line  # noqa: PLR0124 — keep explicit
        and not line.lower().startswith("program area")
    ):
        # Reject long sentence-like lines
        if line.count(" ") <= 10 and not re.search(r"[,;:]", line[1:]):
            return True
    return False


def parse_notes(doc_path: Path, level_meta: dict[str, Any]) -> dict[str, Any]:
    lines = [ln for ln in paras(doc_path) if ln]
    # Find section starts — prefer explicit "Section N: Title" headings.
    section_idxs: list[tuple[int, str, str]] = []
    for i, ln in enumerate(lines):
        m = re.match(r"^Section\s+(\d+)\s*[:\-–]\s*(.+)$", ln, re.I)
        if m:
            section_idxs.append((i, m.group(1), clean(m.group(2))))

    # Program 4 notes omit Section headers; split on repeated "Introduction"
    # markers after "Student Learning Notes", using overview deck titles.
    if len(section_idxs) < 4:
        sln_idx = next(
            (i for i, ln in enumerate(lines) if ln.lower() == "student learning notes"),
            None,
        )
        intro_markers = [
            i
            for i, ln in enumerate(lines)
            if ln.lower() == "introduction" and (sln_idx is None or i > sln_idx)
        ]
        titles = list(level_meta.get("section_titles") or [])
        if len(intro_markers) >= 4 and len(titles) >= 4:
            section_idxs = [
                (intro_markers[i], str(i + 1), titles[i]) for i in range(4)
            ]

    # Intro: from welcome / first substantive paragraph until first section
    intro_parts: list[str] = []
    start = 0
    for i, ln in enumerate(lines):
        if re.search(r"Welcome to GNPS Program 4", ln, re.I):
            start = i
            break
    end = section_idxs[0][0] if section_idxs else len(lines)
    for ln in lines[start:end]:
        if re.match(r"^Level\s+\d+", ln, re.I) and "Student Learning" in " ".join(
            lines[max(0, lines.index(ln) - 2) : lines.index(ln) + 2]
        ):
            continue
        if ln in {
            "Student Learning Notes",
            "Global Nursing Professional Series (GNPS)",
            "GNPS Program 3",
            "GNPS Program 4",
            PROGRAM_THEME,
        }:
            continue
        if ln == PROGRAM_TITLE or ln.strip() == PROGRAM_TITLE:
            continue
        if ln.startswith('"') and ln.endswith('"'):
            continue
        if re.match(r"(?i)^(what you will learn|why this learning matters|your learning goal)$", ln):
            continue
        intro_parts.append(ln)
    intro = " ".join(intro_parts)
    # Soft trim very long intros similarly to ethtl115 style (keep substantial)
    if len(intro) > 2500:
        intro = intro[:2500].rsplit(" ", 1)[0]

    sections: list[dict[str, Any]] = []
    for si, (idx, number, title) in enumerate(section_idxs):
        next_idx = section_idxs[si + 1][0] if si + 1 < len(section_idxs) else len(lines)
        # When splitting on Introduction, keep the Introduction line in body
        # only if this was an explicit Section heading (skip heading itself).
        body_start = idx + 1
        if lines[idx].lower() == "introduction":
            body_start = idx
        body_lines = lines[body_start:next_idx]
        content = build_section_content(body_lines)
        sections.append({"number": number, "title": title, "content": content})

    return {
        "courseCode": COURSE_CODE,
        "title": level_meta["notes_title"],
        "subtitle": PROGRAM_TITLE,
        "intro": intro,
        "sections": sections,
    }


def build_section_content(body_lines: list[str]) -> list[dict[str, Any]]:
    content: list[dict[str, Any]] = []
    i = 0
    n = len(body_lines)

    def take_list(start: int) -> tuple[list[str], int]:
        items: list[str] = []
        j = start
        while j < n and is_bullet(body_lines[j]):
            items.append(strip_bullet(body_lines[j]))
            j += 1
        return items, j

    while i < n:
        ln = body_lines[i]
        low = ln.lower().rstrip(":")

        if low in {"introduction", "core concepts"}:
            i += 1
            continue

        if low == "learning outcomes":
            content.append({"type": "paragraph", "text": "Learning outcomes"})
            i += 1
            if i < n and re.search(r"should be able to", body_lines[i], re.I):
                i += 1
            items, i = take_list(i)
            if items:
                content.append({"type": "list", "items": items})
            continue

        if low == "clinical example":
            i += 1
            example_paras: list[dict[str, Any]] = []
            while i < n and body_lines[i].lower().rstrip(":") != "key learning points":
                if is_bullet(body_lines[i]):
                    items, i = take_list(i)
                    example_paras.append({"type": "list", "items": items})
                else:
                    example_paras.append({"type": "paragraph", "text": body_lines[i]})
                    i += 1
            content.append(
                {
                    "type": "subsection",
                    "number": "Ex",
                    "title": "Clinical example",
                    "content": example_paras
                    or [{"type": "paragraph", "text": ""}],
                }
            )
            continue

        if low == "key learning points":
            content.append({"type": "paragraph", "text": "Key learning points"})
            i += 1
            items, i = take_list(i)
            if items:
                content.append({"type": "list", "items": items})
            continue

        if is_bullet(ln):
            items, i = take_list(i)
            content.append({"type": "list", "items": items})
            continue

        # Concept heading followed by paragraph(s)
        if (
            i + 1 < n
            and len(ln) <= 70
            and not ln.endswith(".")
            and not is_bullet(ln)
            and low not in HEADING_MARKERS
            and body_lines[i + 1]
            and not is_bullet(body_lines[i + 1])
            and body_lines[i + 1].lower().rstrip(":") not in HEADING_MARKERS
        ):
            # Merge heading into following paragraph like ethtl115
            nxt = body_lines[i + 1]
            if not nxt.startswith(ln):
                merged = f"{ln} {nxt}"
            else:
                merged = nxt
            content.append({"type": "paragraph", "text": merged})
            i += 2
            continue

        content.append({"type": "paragraph", "text": ln})
        i += 1

    return content


def extract_key_learning_points(notes: dict[str, Any]) -> list[tuple[str, str]]:
    """Return (section_title, point) pairs."""
    pairs: list[tuple[str, str]] = []
    for section in notes["sections"]:
        title = section["title"]
        blocks = section["content"]
        for bi, block in enumerate(blocks):
            if block.get("type") == "paragraph" and block.get("text", "").lower() == "key learning points":
                if bi + 1 < len(blocks) and blocks[bi + 1].get("type") == "list":
                    for item in blocks[bi + 1]["items"]:
                        pairs.append((title, item))
    return pairs


def parse_quiz(doc_path: Path) -> dict[str, Any]:
    lines = paras(doc_path)
    questions: list[dict[str, Any]] = []
    i = 0
    while i < len(lines):
        m = re.match(r"^Question\s+(\d+)\s*$", lines[i], re.I)
        if not m:
            i += 1
            continue
        qnum = int(m.group(1))
        i += 1
        # Skip metadata line if present
        if i < len(lines) and lines[i].lower().startswith("program area"):
            i += 1
        # Stem may span multiple non-option lines
        stem_parts: list[str] = []
        while i < len(lines) and not re.match(r"^[A-D]\.\s+", lines[i]):
            if re.match(r"^Question\s+\d+\s*$", lines[i], re.I):
                break
            if lines[i]:
                stem_parts.append(lines[i])
            i += 1
        stem = " ".join(stem_parts).strip()
        options: list[dict[str, str]] = []
        while i < len(lines):
            om = re.match(r"^([A-D])\.\s+(.*)$", lines[i])
            if not om:
                break
            options.append({"id": om.group(1), "text": om.group(2).strip()})
            i += 1
        correct = ""
        if i < len(lines):
            cm = re.match(r"^Correct Answer:\s*([A-D])", lines[i], re.I)
            if cm:
                correct = cm.group(1).upper()
                i += 1
        rationale = ""
        if i < len(lines) and re.match(r"^Rationale\s*:", lines[i], re.I):
            rationale = re.sub(r"^Rationale\s*:\s*", "", lines[i], flags=re.I).strip()
            i += 1
            while i < len(lines) and not re.match(r"^Question\s+\d+\s*$", lines[i], re.I):
                if lines[i].lower().startswith("program area"):
                    break
                if lines[i]:
                    rationale = (rationale + " " + lines[i]).strip()
                i += 1
        if stem and options and correct:
            questions.append(
                {
                    "id": f"q{qnum}",
                    "stem": stem,
                    "options": options,
                    "correctOptionId": correct,
                    "rationale": rationale,
                }
            )
    return {"passingScorePercent": 70, "questions": questions}


def parse_case_studies(doc_path: Path) -> list[dict[str, Any]]:
    lines = paras(doc_path)
    cases: list[dict[str, Any]] = []
    case_idxs: list[tuple[int, int, str]] = []
    for i, ln in enumerate(lines):
        m = re.match(r"^Case Study\s+(\d+)\s*[-–:]\s*(.+)$", ln, re.I)
        if m:
            case_idxs.append((i, int(m.group(1)), clean(m.group(2))))

    for ci, (idx, num, title) in enumerate(case_idxs):
        next_idx = case_idxs[ci + 1][0] if ci + 1 < len(case_idxs) else len(lines)
        body = lines[idx + 1 : next_idx]
        # Stem = paragraphs until first Question
        stem_parts: list[str] = []
        qi = 0
        while qi < len(body):
            if re.match(r"^Question\s+\d+", body[qi], re.I):
                break
            if body[qi]:
                stem_parts.append(body[qi])
            qi += 1
        stem = " ".join(stem_parts).strip()

        questions: list[dict[str, Any]] = []
        while qi < len(body):
            qm = re.match(r"^Question\s+(\d+)\s*[-–:]\s*(.+)$", body[qi], re.I)
            if not qm:
                qi += 1
                continue
            qid = f"q{qm.group(1)}"
            qtitle = clean(qm.group(2))
            qi += 1
            qstem_parts: list[str] = []
            while qi < len(body) and not re.match(r"^[A-E]\.\s+", body[qi]):
                if re.match(r"^Question\s+\d+", body[qi], re.I):
                    break
                if re.match(r"^Correct answer", body[qi], re.I):
                    break
                if body[qi]:
                    qstem_parts.append(body[qi])
                qi += 1
            qstem = " ".join(qstem_parts).strip()
            select_all = bool(re.search(r"select all that apply", qstem, re.I))
            options: list[dict[str, str]] = []
            while qi < len(body):
                om = re.match(r"^([A-E])\.\s+(.*)$", body[qi])
                if not om:
                    break
                options.append({"id": om.group(1), "text": om.group(2).strip()})
                qi += 1
            while qi < len(body) and not body[qi]:
                qi += 1
            correct_ids: list[str] = []
            if qi < len(body) and re.match(r"^Correct answers?\s*:", body[qi], re.I):
                raw = re.sub(r"^Correct answers?\s*:\s*", "", body[qi], flags=re.I)
                correct_ids = re.findall(r"[A-E]", raw.upper())
                qi += 1
            while qi < len(body) and not body[qi]:
                qi += 1
            rationale = ""
            if qi < len(body) and re.match(r"^Detailed rationale\s*:", body[qi], re.I):
                rationale = re.sub(
                    r"^Detailed rationale\s*:\s*", "", body[qi], flags=re.I
                ).strip()
                qi += 1
                while qi < len(body) and not re.match(r"^Question\s+\d+", body[qi], re.I):
                    if body[qi]:
                        rationale = (rationale + " " + body[qi]).strip()
                    qi += 1
            elif qi < len(body) and re.match(r"^Rationale\s*:", body[qi], re.I):
                rationale = re.sub(r"^Rationale\s*:\s*", "", body[qi], flags=re.I).strip()
                qi += 1
                while qi < len(body) and not re.match(r"^Question\s+\d+", body[qi], re.I):
                    if body[qi]:
                        rationale = (rationale + " " + body[qi]).strip()
                    qi += 1

            qtype = "select_all" if select_all or len(correct_ids) > 1 else "single"
            if options and correct_ids:
                questions.append(
                    {
                        "id": qid,
                        "title": qtitle,
                        "stem": qstem,
                        "type": qtype,
                        "options": options,
                        "correctOptionIds": correct_ids,
                        "rationale": rationale,
                    }
                )

        cases.append(
            {
                "id": f"case-{num}",
                "title": title,
                "stem": stem,
                "questions": questions,
            }
        )
    return cases


def parse_decisions(doc_path: Path) -> list[dict[str, Any]]:
    lines = paras(doc_path)
    idxs: list[tuple[int, int, str]] = []
    for i, ln in enumerate(lines):
        m = re.match(r"^Decision Point\s+(\d+)\s*:\s*(.+)$", ln, re.I)
        if m:
            idxs.append((i, int(m.group(1)), clean(m.group(2))))

    decisions: list[dict[str, Any]] = []
    for di, (idx, num, title) in enumerate(idxs):
        next_idx = idxs[di + 1][0] if di + 1 < len(idxs) else len(lines)
        body = lines[idx + 1 : next_idx]

        def find_block(start_label: str, stop_labels: list[str]) -> str:
            started = False
            parts: list[str] = []
            for ln in body:
                low = ln.lower().rstrip(":")
                if low == start_label.lower().rstrip(":"):
                    started = True
                    continue
                if started:
                    if low in {s.lower().rstrip(":") for s in stop_labels}:
                        break
                    if ln:
                        parts.append(ln)
            return "\n\n".join(parts).strip()

        scenario = find_block("Scenario", ["Stop & Decide", "Stop &amp; Decide", "Model Clinical Judgment"])
        # Model answers may be on same line or following lines
        model_first = ""
        model_why = ""
        model_next = ""
        trap = ""
        for ln in body:
            if re.match(r"^What would you do FIRST\?", ln, re.I) and "Model" not in ln:
                # Could be prompt line; model line often includes answer after ?
                after = re.sub(r"^What would you do FIRST\?\s*", "", ln, flags=re.I).strip()
                if after:
                    model_first = after
            if re.match(r"^Why\??", ln, re.I) and not re.search(r"priority", ln, re.I):
                after = re.sub(r"^Why\??\s*", "", ln, flags=re.I).strip()
                if after:
                    model_why = after
            if re.match(r"^What you will check next\s*:", ln, re.I):
                after = re.sub(r"^What you will check next\s*:\s*", "", ln, flags=re.I).strip()
                if after:
                    model_next = after
            if re.match(r"^Common NCLEX trap to avoid\s*:", ln, re.I):
                trap = re.sub(
                    r"^Common NCLEX trap to avoid\s*:\s*", "", ln, flags=re.I
                ).strip()

        # Fallback: scan model section more carefully
        in_model = False
        pending: str | None = None
        for ln in body:
            low = ln.lower().rstrip(":")
            if low == "model clinical judgment":
                in_model = True
                continue
            if not in_model:
                continue
            if low.startswith("common nclex trap"):
                after = re.sub(
                    r"^Common NCLEX trap to avoid\s*:\s*", "", ln, flags=re.I
                ).strip()
                if after:
                    trap = after
                    pending = None
                    break
                pending = "trap"
                continue
            if re.match(r"^What would you do FIRST\?", ln, re.I):
                after = re.sub(r"^What would you do FIRST\?\s*", "", ln, flags=re.I).strip()
                if after:
                    model_first = after
                    pending = None
                else:
                    pending = "first"
                continue
            if re.match(r"^Why\??", ln, re.I):
                after = re.sub(r"^Why\??\s*", "", ln, flags=re.I).strip()
                if after and "priority" not in low:
                    model_why = after
                    pending = None
                elif "priority" not in low:
                    pending = "why"
                continue
            if re.match(r"^What you will check next", ln, re.I):
                after = re.sub(r"^What you will check next\s*:\s*", "", ln, flags=re.I).strip()
                if after:
                    model_next = after
                    pending = None
                else:
                    pending = "next"
                continue
            if pending and ln:
                if pending == "first":
                    model_first = ln
                elif pending == "why":
                    model_why = ln
                elif pending == "next":
                    model_next = ln
                elif pending == "trap":
                    trap = ln
                    pending = None
                    break
                pending = None

        decisions.append(
            {
                "id": f"decision-{num}",
                "title": title,
                "scenario": scenario,
                "prompts": [
                    "Your first action",
                    "Your reason (what risk are you preventing?)",
                    "What you will check next (one key assessment)",
                ],
                "modelFirst": model_first,
                "modelWhy": model_why,
                "modelNext": model_next,
                "trap": trap,
                "programNumber": num,
                "number": num,
            }
        )
    return decisions


def build_flashcards(notes: dict[str, Any]) -> dict[str, Any]:
    pairs = extract_key_learning_points(notes)
    cards: list[dict[str, str]] = []
    for i, (section, point) in enumerate(pairs, start=1):
        cards.append(
            {
                "id": f"fc-{i}",
                "front": f"What is a key learning point from '{section}'?",
                "back": point,
            }
        )
    # Ensure at least one card per section if key points missing
    if not cards:
        for i, section in enumerate(notes["sections"], start=1):
            cards.append(
                {
                    "id": f"fc-{i}",
                    "front": f"Recall the focus of: {section['title']}",
                    "back": f"Review Level content on {section['title']} — adult medical-surgical nursing and clinical judgment.",
                }
            )
    return {"cards": cards}


def build_video_explainer(level_num: int, notes: dict[str, Any]) -> dict[str, Any]:
    bullets: list[dict[str, str]] = []
    intro = notes.get("intro") or ""
    # Split intro into rough chunks by known headings embedded as spaces
    bullets.append(
        {
            "title": "Title",
            "text": (
                f"Hi everyone, and welcome to GNPS Program 3 – {PROGRAM_TITLE}. "
                f"This is Level {level_num}. "
                + (intro[:280] + "…" if len(intro) > 280 else intro)
            ),
        }
    )
    bullets.append(
        {
            "title": "Welcome to GNPS Program 4",
            "text": intro[:400] + ("…" if len(intro) > 400 else ""),
        }
    )
    for section in notes["sections"]:
        # First paragraph of section as explainer bullet
        first_para = ""
        for block in section["content"]:
            if block.get("type") == "paragraph" and block.get("text"):
                t = block["text"]
                if t.lower() not in {"learning outcomes", "key learning points"}:
                    first_para = t
                    break
        text = first_para or section["title"]
        if len(text) > 320:
            text = text[:320].rsplit(" ", 1)[0] + "…"
        bullets.append({"title": section["title"], "text": text})
    # Cap similar to ethtl115 (~6 bullets)
    if len(bullets) > 6:
        bullets = bullets[:6]
    return {
        "level": level_num,
        "headline": "Key points from this level's lecture",
        "bullets": bullets,
    }


def extract_pptx_slides(pptx_path: Path) -> list[dict[str, Any]]:
    if not pptx_path.exists():
        return []
    prs = Presentation(str(pptx_path))
    slides_out: list[dict[str, Any]] = []

    def shape_texts(shape) -> list[str]:
        texts: list[str] = []
        if shape.has_text_frame:
            for p in shape.text_frame.paragraphs:
                t = clean(p.text)
                if t:
                    texts.append(t)
        if shape.shape_type == MSO_SHAPE_TYPE.GROUP:
            for s in shape.shapes:
                texts.extend(shape_texts(s))
        return texts

    for slide in prs.slides:
        chunks: list[str] = []
        for shape in slide.shapes:
            chunks.extend(shape_texts(shape))
        # Deduplicate while preserving order
        seen: set[str] = set()
        uniq: list[str] = []
        for t in chunks:
            if t not in seen:
                seen.add(t)
                uniq.append(t)
        if not uniq:
            continue
        title = uniq[0]
        rest = uniq[1:]
        body = ""
        bullets: list[dict[str, str]] = []
        if rest:
            # First remaining non-bullet-like as body; rest as bullets
            body = rest[0]
            for item in rest[1:]:
                if len(item) > 120:
                    bullets.append({"label": item[:48].rsplit(" ", 1)[0], "text": item})
                else:
                    bullets.append({"label": item, "text": ""})
        slides_out.append({"title": title, "body": body, "bullets": bullets, "texts": uniq})
    return slides_out


def kind_for_card(title: str, index: int) -> str:
    low = title.lower()
    if index == 0:
        return "title"
    if "learning outcome" in low or low.startswith("section") and "outcome" in low:
        return "outcomes"
    if "clinical example" in low or low.startswith("clinical example"):
        return "example"
    if "key learning" in low:
        return "keypoints"
    if "core concept" in low or "at a glance" in low:
        return "concepts"
    return "content"


def cards_from_notes_section(
    section: dict[str, Any],
    level_num: int,
    program_title: str,
    source_file: str,
) -> list[dict[str, Any]]:
    cards: list[dict[str, Any]] = []
    card_id = 1

    def add(kind: str, title: str, body: str = "", bullets: list | None = None, callout: str | None = None):
        nonlocal card_id
        cards.append(
            {
                "kind": kind,
                "title": title,
                "body": body or "",
                "bullets": bullets or [],
                "callout": callout,
                "id": f"card-{card_id}",
            }
        )
        card_id += 1

    add(
        "title",
        "Global Nursing Professional Series (GNPS)",
        f"Programme 4 – {program_title} Level {level_num} · {section['title']}",
    )
    add(
        "content",
        f"Section {section['number']}: {section['title']}",
        f"Focus area for Level {level_num} of GNPS Program 3.",
        [
            {"label": "Purpose", "text": f"Strengthen competence in {section['title']}"},
            {"label": "Focus", "text": "Safe medication practice and clinical judgment"},
            {"label": "Relevance", "text": "Aligned with NCLEX-style clinical judgment"},
        ],
    )

    # Walk content blocks
    i = 0
    blocks = section["content"]
    while i < len(blocks):
        block = blocks[i]
        if block.get("type") == "paragraph":
            text = block.get("text") or ""
            low = text.lower()
            if low == "learning outcomes":
                bullets: list[dict[str, str]] = [
                    {"label": "LEARNING OUTCOMES", "text": "After completing this section, you will be able to:"}
                ]
                if i + 1 < len(blocks) and blocks[i + 1].get("type") == "list":
                    for item in blocks[i + 1]["items"]:
                        bullets.append({"label": item[:40], "text": item})
                    i += 2
                else:
                    i += 1
                add("outcomes", f"Section {section['number']}: {section['title']}", "", bullets)
                continue
            if low == "key learning points":
                bullets = []
                if i + 1 < len(blocks) and blocks[i + 1].get("type") == "list":
                    for item in blocks[i + 1]["items"]:
                        label = item.split(".")[0][:48] if "." in item else item[:48]
                        bullets.append({"label": label, "text": item})
                    i += 2
                else:
                    i += 1
                add("keypoints", "Key Learning Points", "", bullets)
                continue
            # Concept-style paragraph: Title + rest
            parts = text.split(" ", 3)
            if len(text) > 40 and " " in text:
                # Try split first phrase as label
                m = re.match(r"^([A-Z][^.]{0,50}?)\s+([a-z].+)$", text)
                if m and len(m.group(1).split()) <= 6:
                    add(
                        "content",
                        m.group(1).upper() if len(m.group(1)) < 40 else m.group(1),
                        m.group(2),
                        [{"label": m.group(1), "text": m.group(2)}],
                    )
                else:
                    add("content", text[:60].rsplit(" ", 1)[0] if len(text) > 60 else text, text)
            else:
                add("content", text, text)
            i += 1
            continue
        if block.get("type") == "list":
            bullets = [{"label": it[:48], "text": it} for it in block.get("items") or []]
            add("content", "Key points", "", bullets)
            i += 1
            continue
        if block.get("type") == "subsection":
            sub_paras = []
            for sb in block.get("content") or []:
                if sb.get("type") == "paragraph" and sb.get("text"):
                    sub_paras.append(sb["text"])
            body = " ".join(sub_paras)
            add(
                "example",
                "CLINICAL EXAMPLE",
                body,
                [{"label": block.get("title") or "Clinical example", "text": body}],
                callout="Apply the same judgment in your own practice.",
            )
            i += 1
            continue
        i += 1

    # Attach unused source_file reference via caller
    _ = source_file
    return cards


def cards_from_pptx(slides: list[dict[str, Any]], fallback_title: str) -> list[dict[str, Any]]:
    cards: list[dict[str, Any]] = []
    for i, sl in enumerate(slides):
        title = sl.get("title") or fallback_title
        kind = kind_for_card(title, i)
        body = sl.get("body") or ""
        bullets = []
        for b in sl.get("bullets") or []:
            if isinstance(b, dict):
                bullets.append({"label": b.get("label") or "", "text": b.get("text") or ""})
            else:
                bullets.append({"label": str(b), "text": ""})
        # If no structured bullets, turn remaining texts into bullets
        if not bullets and len(sl.get("texts") or []) > 2:
            for t in sl["texts"][2:6]:
                bullets.append({"label": t[:48], "text": t})
        cards.append(
            {
                "kind": kind,
                "title": title,
                "body": body,
                "bullets": bullets,
                "callout": None,
                "id": f"card-{i + 1}",
            }
        )
    return cards


def build_slides(level_meta: dict[str, Any], notes: dict[str, Any]) -> dict[str, Any]:
    level_num = level_meta["number"]
    folder = SRC / level_meta["folder"]
    decks: list[dict[str, Any]] = []

    # Overview deck
    overview_path = folder / level_meta["overview_pptx"]
    overview_slides = extract_pptx_slides(overview_path)
    if overview_slides:
        overview_cards = cards_from_pptx(overview_slides, f"Level {level_num} overview")
    else:
        overview_cards = [
            {
                "kind": "title",
                "title": "Global Nursing Professional Series",
                "body": f"GNPS Program 3 – {PROGRAM_TITLE} Level {level_num}",
                "bullets": [],
                "callout": None,
                "id": "card-1",
            },
            {
                "kind": "content",
                "title": "Welcome to GNPS Program 4",
                "body": notes.get("intro", "")[:500],
                "bullets": [],
                "callout": None,
                "id": "card-2",
            },
        ]
        for si, section in enumerate(notes["sections"], start=3):
            overview_cards.append(
                {
                    "kind": "content",
                    "title": f"SECTION {section['number']}",
                    "body": section["title"],
                    "bullets": [{"label": section["title"], "text": ""}],
                    "callout": None,
                    "id": f"card-{si}",
                }
            )

    decks.append(
        {
            "id": "overview",
            "title": f"Level {level_num} overview",
            "pageSuffix": "slides-overview",
            "sourceFile": level_meta["overview_pptx"],
            "cards": overview_cards,
        }
    )

    for si, section in enumerate(notes["sections"]):
        pptx_name = level_meta["section_pptx"][si]
        pptx_path = folder / pptx_name
        pptx_slides = extract_pptx_slides(pptx_path)
        if pptx_slides and len(pptx_slides) >= 4:
            cards = cards_from_pptx(pptx_slides, section["title"])
        else:
            cards = cards_from_notes_section(
                section, level_num, PROGRAM_TITLE, pptx_name
            )
            # If PPTX had some slides, prepend a few as enrichment
            if pptx_slides:
                extra = cards_from_pptx(pptx_slides[:3], section["title"])
                # renumber
                merged = extra + cards
                for i, c in enumerate(merged, start=1):
                    c["id"] = f"card-{i}"
                cards = merged

        decks.append(
            {
                "id": f"section-{si + 1}",
                "title": section["title"],
                "pageSuffix": f"slides-section-{si + 1}",
                "sourceFile": pptx_name,
                "cards": cards,
            }
        )

    return {"level": level_num, "format": "interactive", "decks": decks}


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)

    levels_json = {
        "courseCode": COURSE_CODE,
        "programTitle": PROGRAM_TITLE,
        "levels": [
            {
                "id": m["id"],
                "number": m["number"],
                "title": m["title"],
                "blurb": m["blurb"],
                "pagePrefix": m["pagePrefix"],
            }
            for m in LEVEL_META
        ],
    }
    write_json(OUT / "levels.json", levels_json)

    all_cases = parse_case_studies(CASE_STUDIES_DOC)
    assert len(all_cases) >= 15, f"Expected 15 cases, got {len(all_cases)}"
    all_decisions = parse_decisions(DECISION_DOC)
    assert len(all_decisions) >= 24, f"Expected >=24 decisions, got {len(all_decisions)}"

    summary: dict[str, Any] = {"levels.json": levels_json["levels"]}

    for m in LEVEL_META:
        lv = m["number"]
        out_dir = OUT / m["id"]
        notes_path = SRC / m["folder"] / m["notes"]
        quiz_path = SRC / m["folder"] / m["quiz"]

        notes = parse_notes(notes_path, m)
        quiz = parse_quiz(quiz_path)
        cases = {
            "level": lv,
            "cases": all_cases[(lv - 1) * 5 : lv * 5],
        }
        # Remap case ids to case-1..case-5 per level
        remapped = []
        for i, c in enumerate(cases["cases"], start=1):
            nc = dict(c)
            nc["id"] = f"case-{i}"
            remapped.append(nc)
        cases["cases"] = remapped

        decisions_slice = all_decisions[(lv - 1) * 8 : lv * 8]
        remapped_decisions = []
        for i, d in enumerate(decisions_slice, start=1):
            nd = dict(d)
            global_num = (lv - 1) * 8 + i
            nd["id"] = f"decision-{i}"
            nd["number"] = i
            nd["programNumber"] = global_num
            remapped_decisions.append(nd)

        decisions = {
            "level": lv,
            "title": "Decision Practice",
            "subtitle": "Stop & Decide prompts to build active clinical judgment",
            "howToUse": (
                "These decision points interrupt passive reading and force active thinking. "
                "For each scenario, pause and write your response. Then compare with the model response. "
                "Focus on (1) the immediate risk, (2) the safest first nursing action, and "
                "(3) what data you must check next."
            ),
            "decisions": remapped_decisions,
        }

        flashcards = build_flashcards(notes)
        video = build_video_explainer(lv, notes)
        slides = build_slides(m, notes)

        write_json(out_dir / "notes.json", notes)
        write_json(out_dir / "quiz.json", quiz)
        write_json(out_dir / "case-studies.json", cases)
        write_json(out_dir / "decision-practice.json", decisions)
        write_json(out_dir / "flashcards.json", flashcards)
        write_json(out_dir / "video-explainer.json", video)
        write_json(out_dir / "slides.json", slides)

        summary[m["id"]] = {
            "notes_sections": len(notes["sections"]),
            "notes_titles": [s["title"] for s in notes["sections"]],
            "quiz_questions": len(quiz["questions"]),
            "cases": len(cases["cases"]),
            "case_questions": [len(c["questions"]) for c in cases["cases"]],
            "decisions": len(decisions["decisions"]),
            "flashcards": len(flashcards["cards"]),
            "video_bullets": len(video["bullets"]),
            "slide_decks": len(slides["decks"]),
            "slide_cards": sum(len(d["cards"]) for d in slides["decks"]),
        }

    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
