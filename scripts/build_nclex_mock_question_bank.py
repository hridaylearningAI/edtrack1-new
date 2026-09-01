#!/usr/bin/env python3
"""Build unified NCLEX mock / free-test question bank from Mock Test docx files."""

from __future__ import annotations

import argparse
import html
import json
import re
import sys
import zipfile
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent

DEFAULT_SOURCE = Path(
    "/Users/hridaygoswami/Library/Mobile Documents/com~apple~CloudDocs/"
    "EdTec Project/2. EdTec.Online/3. Training Design/"
    "1. Training Programs - Phase I - Launch/EdTec.Online - Phase 1 Programs/"
    "Program Category 5 - TestPrep Programs/"
    "1. TestPrep - NCLEX -OSCE - Nursing /EdTec - NCLEX  - TestPrep Materials/"
    "Mock Test - Question Bank"
)

DEFAULT_OUT = REPO_ROOT / "data/nclex-mock-bank"

GNPS_QB_RE = re.compile(
    r"^GNPS Program (\d+) - Level (\d+) - Question Bank with Labels and Rationale?s?\.docx$",
    re.I,
)
GNPS_NGN_RE = re.compile(r"^GNPS Program (\d+) - Level 3 - NGN Upgrade\.docx$", re.I)

PROGRAM_TITLES = {
    1: "Building Strong Foundations in Nursing Practice",
    2: "Creating Safe Healthcare Environments",
    3: "Safe Medication Practice",
    4: "Caring for Adults with Confidence",
    5: "Advanced Adult Nursing Care",
    6: "Supporting Mothers and Newborns",
    7: "Caring for Children and Families",
    8: "Compassionate Mental Health Care",
    9: "Professionalism in Nursing Practice",
    10: "Mastering Essential Clinical Skills",
}


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


def parse_meta_line(meta: str) -> tuple[str, str, str]:
    difficulty = "easy"
    program_area = ""
    section_label = ""
    dm = re.search(r"Difficulty:\s*([^|]+)", meta, re.I)
    if dm:
        difficulty = map_difficulty(dm.group(1))
    pam = re.search(r"Program Area:\s*([^|]+)", meta, re.I)
    if pam:
        program_area = pam.group(1).strip()
    slm = re.search(r"Section:\s*([^|]+)", meta, re.I)
    if slm:
        section_label = re.sub(r"^\d+\s*[–-]\s*", "", slm.group(1).strip()).strip()
    return difficulty, program_area, section_label


def parse_gnps_quiz(lines: list[str]) -> list[dict]:
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
        if i < len(lines) and (
            "Difficulty:" in lines[i]
            or lines[i].startswith("Program Area")
            or "| Level:" in lines[i]
        ):
            difficulty, program_area, parsed_section = parse_meta_line(lines[i])
            if parsed_section:
                section_label = parsed_section
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
            options.append({"letter": om.group(1), "text": om.group(2).strip()})
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
        if i < len(lines) and re.match(r"^Rationale\s*:?", lines[i], re.I):
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
            raise ValueError(
                f"Failed GNPS Question {qnum}: stem={bool(stem)} opts={len(options)} "
                f"correct={correct!r} section={section}"
            )
        questions.append(
            {
                "section": section,
                "sectionLabel": section_label,
                "programArea": program_area,
                "difficulty": difficulty,
                "stem": stem,
                "options": options,
                "correctLetter": correct,
                "rationale": rationale,
                "questionNumber": qnum,
            }
        )
    return questions


def split_inline_options(text: str) -> list[tuple[str, str]]:
    """Extract A–D options from a single paragraph (with or without spaces between options)."""
    body = re.split(r"\bAnswer\s*:", text, maxsplit=1, flags=re.I)[0].strip()
    markers = list(re.finditer(r"([A-D])\.\s+", body))
    if not markers:
        return []
    options: list[tuple[str, str]] = []
    for idx, match in enumerate(markers):
        letter = match.group(1)
        start = match.end()
        end = markers[idx + 1].start() if idx + 1 < len(markers) else len(body)
        options.append((letter, body[start:end].strip()))
    return options


def extract_answer_and_rationale(text: str) -> tuple[str, str]:
    correct = ""
    rationale = ""
    ans = re.search(r"Answer\s*:\s*([A-D])", text, re.I)
    if ans:
        correct = ans.group(1).upper()
    rat = re.search(r"Rationale\s*:\s*(.+)$", text, re.I | re.DOTALL)
    if rat:
        rationale = rat.group(1).strip()
    return correct, rationale


def parse_nclex_total_bank(lines: list[str]) -> list[dict]:
    questions: list[dict] = []
    module_idx = -1
    module_title = ""
    qnum = 0
    i = 0
    while i < len(lines):
        ln = lines[i]
        mm = re.match(r"^Module\s+(\d+):\s*(.+)$", ln, re.I)
        if mm:
            module_idx = int(mm.group(1)) - 1
            module_title = mm.group(2).strip()
            i += 1
            continue
        qm = re.match(r"^(\d+)\.\s+(.+)$", ln)
        if not qm:
            i += 1
            continue
        qnum = int(qm.group(1))
        stem = qm.group(2).strip()
        difficulty = "easy"
        options: list[dict[str, str]] = []
        correct = ""
        rationale = ""
        i += 1
        if i < len(lines) and re.search(r"Difficulty Level:", lines[i], re.I):
            difficulty = map_difficulty(lines[i])
            i += 1
        while i < len(lines):
            line = lines[i]
            if re.match(r"^\d+\.\s+", line):
                break
            if re.match(r"^Module\s+\d+:", line, re.I):
                break
            inline_opts = split_inline_options(line)
            if inline_opts:
                options = [{"letter": l, "text": t} for l, t in inline_opts]
                correct, rationale = extract_answer_and_rationale(line)
                i += 1
                if not correct and i < len(lines):
                    correct, rationale = extract_answer_and_rationale(lines[i])
                    if correct or rationale:
                        i += 1
                break
            om = re.match(r"^([A-D])\.\s+(.*)$", line)
            if om:
                options.append({"letter": om.group(1), "text": om.group(2).strip()})
                i += 1
                continue
            if options and re.search(r"Answer\s*:", line, re.I):
                correct, rationale = extract_answer_and_rationale(line)
                i += 1
                break
            if not options:
                i += 1
                continue
            break
        if not (stem and len(options) >= 2 and correct):
            continue
        questions.append(
            {
                "topicIndex": max(module_idx, 0),
                "topicTitle": module_title or f"Module {module_idx + 1}",
                "difficulty": difficulty,
                "stem": stem,
                "options": options,
                "correctLetter": correct,
                "rationale": rationale,
                "questionNumber": qnum,
            }
        )
    return questions


def parse_ngn_upgrade(lines: list[str], program: int) -> list[dict]:
    questions: list[dict] = []
    module_num = 1
    case_num = 0
    section_label = ""
    i = 0
    while i < len(lines):
        ln = lines[i]
        mod = re.match(r"^Module\s+(\d+)\s*[–-]\s*(.+)$", ln, re.I)
        if mod:
            module_num = int(mod.group(1))
            i += 1
            continue
        if ln.startswith("Case Study"):
            case_num += 1
            i += 1
            continue
        qm = re.match(r"^Question\s+(\d+)\s*[-–]\s*(.+)$", ln, re.I)
        if not qm:
            if ln.startswith("Program Area:"):
                _, _, section_label = parse_meta_line(ln)
            i += 1
            continue
        q_sub = int(qm.group(1))
        i += 1
        i = skip_blank(lines, i)
        stem_parts: list[str] = []
        while i < len(lines):
            if re.match(r"^[A-E]\.\s+", lines[i]):
                break
            if re.match(r"^Question\s+\d+", lines[i], re.I):
                break
            if lines[i]:
                stem_parts.append(lines[i])
            i += 1
        stem = " ".join(stem_parts).strip()
        options: list[dict[str, str]] = []
        while i < len(lines):
            om = re.match(r"^([A-E])\.\s+(.*)$", lines[i])
            if not om:
                break
            options.append({"letter": om.group(1), "text": om.group(2).strip()})
            i += 1
        i = skip_blank(lines, i)
        correct_keys: list[str] = []
        if i < len(lines) and re.match(r"^Correct answers?:", lines[i], re.I):
            keys = re.findall(r"[A-E]", lines[i].split(":", 1)[-1], re.I)
            correct_keys = [k.upper() for k in keys]
            i += 1
        i = skip_blank(lines, i)
        rationale = ""
        if i < len(lines) and re.match(r"^Detailed rationale:", lines[i], re.I):
            rationale = lines[i].split(":", 1)[-1].strip()
            i += 1
            while i < len(lines) and not re.match(r"^Question\s+\d+", lines[i], re.I) and not lines[i].startswith(
                "Program Area:"
            ) and not lines[i].startswith("Case Study"):
                if lines[i]:
                    rationale = (rationale + " " + lines[i]).strip()
                i += 1
        if not (stem and options and correct_keys):
            continue
        multi = len(correct_keys) > 1
        questions.append(
            {
                "program": program,
                "module": module_num,
                "caseStudy": case_num,
                "sectionLabel": section_label,
                "difficulty": "hard",
                "stem": stem,
                "options": options,
                "correctLetter": correct_keys[0],
                "correctKeys": correct_keys,
                "ngnMultiSelect": multi,
                "rationale": rationale,
                "questionNumber": q_sub,
            }
        )
    return questions


def normalize_gnps_question(raw: dict, program: int, level: int) -> dict:
    sec = raw["section"]
    qn = raw.get("questionNumber", 0)
    return {
        "id": f"p{program}-l{level}-s{sec}-q{qn}",
        "program": program,
        "level": level,
        "section": sec,
        "sectionLabel": raw.get("sectionLabel", f"Section {sec}"),
        "programArea": raw.get("programArea", PROGRAM_TITLES.get(program, "")),
        "difficulty": raw.get("difficulty", "easy"),
        "stem": raw["stem"],
        "options": raw["options"],
        "correctLetter": raw["correctLetter"],
        "rationale": raw.get("rationale", ""),
        "source": "gnps",
    }


def normalize_nclex_question(raw: dict, idx: int) -> dict:
    return {
        "id": f"nclex-t{raw.get('topicIndex', 0)}-q{idx}",
        "program": None,
        "level": None,
        "section": None,
        "sectionLabel": raw.get("topicTitle", ""),
        "programArea": raw.get("topicTitle", ""),
        "topicIndex": raw.get("topicIndex", 0),
        "difficulty": raw.get("difficulty", "easy"),
        "stem": raw["stem"],
        "options": raw["options"],
        "correctLetter": raw["correctLetter"],
        "rationale": raw.get("rationale", ""),
        "source": "nclex",
    }


def normalize_ngn_question(raw: dict, idx: int) -> dict:
    program = raw.get("program")
    return {
        "id": f"ngn-p{program}-m{raw.get('module', 0)}-c{raw.get('caseStudy', 0)}-q{idx}",
        "program": program,
        "level": 3,
        "section": None,
        "sectionLabel": raw.get("sectionLabel", ""),
        "programArea": PROGRAM_TITLES.get(program or 0, ""),
        "module": raw.get("module"),
        "caseStudy": raw.get("caseStudy"),
        "difficulty": raw.get("difficulty", "hard"),
        "stem": raw["stem"],
        "options": raw["options"],
        "correctLetter": raw["correctLetter"],
        "correctKeys": raw.get("correctKeys"),
        "ngnMultiSelect": raw.get("ngnMultiSelect", False),
        "rationale": raw.get("rationale", ""),
        "source": "ngn",
    }


def validate_free_test_cells(by_program: dict[int, list[dict]]) -> list[str]:
    errors: list[str] = []
    for program in range(1, 11):
        qs = by_program.get(program, [])
        by_section: dict[int, int] = Counter(q["section"] for q in qs)
        for section in range(1, 5):
            count = by_section.get(section, 0)
            if count < 2:
                errors.append(f"Program {program} Section {section}: only {count} questions (need >=2)")
    return errors


def build_bank(source: Path, out_dir: Path) -> dict:
    if not source.is_dir():
        raise SystemExit(f"Source folder not found: {source}")

    by_program: dict[int, list[dict]] = defaultdict(list)
    ngn_questions: list[dict] = []
    ngn_idx = 0

    for path in sorted(source.iterdir()):
        if not path.is_file() or path.suffix.lower() != ".docx":
            continue
        name = path.name
        gnps_match = GNPS_QB_RE.match(name)
        if gnps_match:
            program = int(gnps_match.group(1))
            level = int(gnps_match.group(2))
            raw_questions = parse_gnps_quiz(docx_paragraphs(path))
            for raw in raw_questions:
                by_program[program].append(normalize_gnps_question(raw, program, level))
            print(f"GNPS  P{program} L{level}: {len(raw_questions)} questions")
            continue
        ngn_match = GNPS_NGN_RE.match(name)
        if ngn_match:
            program = int(ngn_match.group(1))
            raw_ngn = parse_ngn_upgrade(docx_paragraphs(path), program)
            for raw in raw_ngn:
                ngn_idx += 1
                ngn_questions.append(normalize_ngn_question(raw, ngn_idx))
            print(f"NGN   P{program}: {len(raw_ngn)} questions")
            continue

    nclex_path = source / "NCLEX total Question Bank with Difficuly level labled.docx"
    nclex_questions: list[dict] = []
    if nclex_path.exists():
        raw_nclex = parse_nclex_total_bank(docx_paragraphs(nclex_path))
        for idx, raw in enumerate(raw_nclex, start=1):
            nclex_questions.append(normalize_nclex_question(raw, idx))
        print(f"NCLEX pool: {len(nclex_questions)} questions")
    else:
        print(f"WARNING: NCLEX total bank not found at {nclex_path}")

    validation_errors = validate_free_test_cells(by_program)
    if validation_errors:
        print("\nVALIDATION ERRORS:")
        for err in validation_errors:
            print(f"  - {err}")
        raise SystemExit(1)

    out_dir.mkdir(parents=True, exist_ok=True)
    programs_dir = out_dir / "programs"
    programs_dir.mkdir(exist_ok=True)

    program_counts: dict[str, int] = {}
    for program in range(1, 11):
        qs = by_program.get(program, [])
        program_counts[str(program)] = len(qs)
        payload = {
            "program": program,
            "courseCode": f"ETHTL{114 + program}",
            "title": PROGRAM_TITLES.get(program, f"GNPS Program {program}"),
            "questions": qs,
        }
        (programs_dir / f"p{program}.json").write_text(
            json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )

    (out_dir / "nclex-pool.json").write_text(
        json.dumps({"questions": nclex_questions}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    (out_dir / "ngn-pool.json").write_text(
        json.dumps({"questions": ngn_questions}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    total = sum(program_counts.values()) + len(nclex_questions) + len(ngn_questions)
    manifest = {
        "version": 1,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "sourceFolder": str(source),
        "programCounts": program_counts,
        "nclexPoolCount": len(nclex_questions),
        "ngnPoolCount": len(ngn_questions),
        "totalQuestions": total,
        "freeTestQuestionsPerProgram": 8,
        "freeTestTotalQuestions": 80,
        "passThresholdPerProgram": 6,
    }
    (out_dir / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    print(f"\nWrote {total} questions to {out_dir}")
    print("Program counts:", program_counts)
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser(description="Build NCLEX mock / free-test question bank JSON")
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    args = parser.parse_args()
    build_bank(args.source, args.out)


if __name__ == "__main__":
    main()
