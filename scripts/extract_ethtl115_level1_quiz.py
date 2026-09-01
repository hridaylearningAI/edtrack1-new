#!/usr/bin/env python3
"""Extract GNPS Program 1 (ETHTL115) MCQ banks into level quiz.json files."""

from __future__ import annotations

import argparse
import html
import json
import re
import zipfile
from collections import Counter
from pathlib import Path

PROGRAM_ROOT = Path(
    "/Users/hridaygoswami/Library/Mobile Documents/com~apple~CloudDocs/"
    "EdTec Project/2. EdTec.Online/3. Training Design/"
    "1. Training Programs - Phase I - Launch/EdTec.Online - Phase 1 Programs/"
    "Program Category 5 - TestPrep Programs/"
    "1. TestPrep - NCLEX -OSCE - Nursing /EdTec - NCLEX  - TestPrep Materials/"
    "EdTec GNPS and Programs/"
    "GNPS Program 1 - Building Strong Foundations in Nursing Practice"
)

LEVEL_DOCX = {
    1: PROGRAM_ROOT
    / "GNPS Program 1 - Level 1 - Qualified Nurse"
    / "GNPS Program 1 - Level 1 - Question Bank with Labels and Rationale.docx",
    2: PROGRAM_ROOT
    / "GNPS Program 1 - Level 2 - International Qualified Nurse"
    / "GNPS Program 1 - Level 2 - Question Bank with Labels and Rationale.docx",
    3: PROGRAM_ROOT
    / "GNPS Program 1 - Level 3 - Global Nurse Professional"
    / "GNPS Program 1 - Level 3 - Question Bank with Labels and Rationale.docx",
}

DATA_ROOT = Path(__file__).resolve().parents[1] / "data/gnps/ethtl115"


def docx_paragraphs(path: Path) -> list[str]:
    with zipfile.ZipFile(path) as z:
        xml = z.read("word/document.xml").decode("utf-8")
    paras = re.findall(r"<w:p[\s>].*?</w:p>", xml, flags=re.DOTALL)
    lines: list[str] = []
    for p in paras:
        texts = re.findall(r"<w:t[^>]*>(.*?)</w:t>", p, flags=re.DOTALL)
        if not texts:
            lines.append("")
            continue
        lines.append("".join(html.unescape(t) for t in texts).strip())
    return lines


def map_difficulty(raw: str) -> str:
    v = (raw or "").strip().lower()
    if "moderate" in v:
        return "moderate"
    if "difficult" in v or "complex" in v or "hard" in v:
        return "hard"
    return "easy"


def skip_blank(lines: list[str], i: int) -> int:
    while i < len(lines) and not lines[i]:
        i += 1
    return i


def parse_quiz(lines: list[str]) -> dict:
    section: int | None = None
    section_heading: str | None = None
    questions: list[dict] = []
    i = 0
    while i < len(lines):
        ln = lines[i]
        sm = re.match(r"^Section\s+(\d+)\s*[–-]\s*(.+)$", ln)
        if sm:
            section = int(sm.group(1))
            section_heading = sm.group(2).strip()
            i += 1
            continue
        qm = re.match(r"^Question\s+(\d+)\s*$", ln)
        if not qm:
            i += 1
            continue
        qnum = int(qm.group(1))
        i += 1
        i = skip_blank(lines, i)
        difficulty = "easy"
        program_area = ""
        section_label = section_heading or (f"Section {section}" if section is not None else "")
        if i < len(lines) and ("Difficulty:" in lines[i] or lines[i].startswith("Program Area")):
            meta = lines[i]
            dm = re.search(r"Difficulty:\s*([^|]+)", meta)
            if dm:
                difficulty = map_difficulty(dm.group(1))
            pam = re.search(r"Program Area:\s*([^|]+)", meta)
            if pam:
                program_area = pam.group(1).strip()
            slm = re.search(r"Section:\s*([^|]+)", meta)
            if slm:
                # Prefer the bank's section label; drop leading "1 – " numbering when present.
                section_label = re.sub(r"^\d+\s*[–-]\s*", "", slm.group(1).strip()).strip()
            i += 1
        stem_parts: list[str] = []
        while i < len(lines):
            if re.match(r"^[A-D]\.\s+", lines[i]):
                break
            if re.match(r"^Question\s+\d+\s*$", lines[i]) or re.match(r"^Section\s+\d+", lines[i]):
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
        i = skip_blank(lines, i)
        correct = ""
        if i < len(lines):
            cm = re.match(r"^Correct Answer:\s*([A-D])", lines[i], re.I)
            if cm:
                correct = cm.group(1).upper()
                i += 1
        i = skip_blank(lines, i)
        rationale = ""
        if i < len(lines) and re.match(r"^Rationale\s*:", lines[i], re.I):
            rationale = re.sub(r"^Rationale\s*:\s*", "", lines[i], flags=re.I).strip()
            i += 1
            while i < len(lines) and not re.match(r"^Question\s+\d+\s*$", lines[i]) and not re.match(
                r"^Section\s+\d+", lines[i]
            ):
                if lines[i].startswith("Program Area"):
                    break
                if lines[i]:
                    rationale = (rationale + " " + lines[i]).strip()
                i += 1
        if not (stem and len(options) >= 2 and correct and section is not None):
            raise SystemExit(
                f"Failed to parse Question {qnum}: stem={bool(stem)} opts={len(options)} "
                f"correct={correct!r} section={section}"
            )
        questions.append(
            {
                "id": f"q{qnum}",
                "section": section,
                "sectionLabel": section_label,
                "programArea": program_area,
                "difficulty": difficulty,
                "stem": stem,
                "options": options,
                "correctOptionId": correct,
                "rationale": rationale,
            }
        )
    return {"passingScorePercent": 70, "questions": questions}


def extract_level(level: int, docx: Path | None = None, out: Path | None = None) -> Path:
    src = docx or LEVEL_DOCX[level]
    dest = out or (DATA_ROOT / f"level-{level}/quiz.json")
    if not src.exists():
        raise SystemExit(f"DOCX not found: {src}")
    quiz = parse_quiz(docx_paragraphs(src))
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(quiz, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    by_section = Counter(q["section"] for q in quiz["questions"])
    print(f"Level {level}: wrote {len(quiz['questions'])} questions -> {dest}")
    print("  by section:", dict(sorted(by_section.items())))
    print("  by difficulty:", dict(Counter(q["difficulty"] for q in quiz["questions"])))
    return dest


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--level",
        type=int,
        choices=[1, 2, 3],
        action="append",
        help="Level(s) to extract (default: all)",
    )
    parser.add_argument("--docx", type=Path, help="Override DOCX path (requires single --level)")
    parser.add_argument("--out", type=Path, help="Override output path (requires single --level)")
    args = parser.parse_args()
    levels = args.level or [1, 2, 3]
    if (args.docx or args.out) and len(levels) != 1:
        raise SystemExit("--docx/--out require exactly one --level")
    for level in levels:
        extract_level(level, docx=args.docx, out=args.out)


if __name__ == "__main__":
    main()
