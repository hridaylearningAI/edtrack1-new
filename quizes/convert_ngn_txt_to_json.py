#!/usr/bin/env python3
"""
Convert NGN "Next-Generation NCLEX (NGN)" TXT resources into JSON.

Input format (based on `public/sample_ngn/sample.txt`):
- Module line:  "Module 1 – Fundamentals of Nursing" (en-dash or hyphen)
- Case header:  "Case Study 1 - Acute Oxygenation Drop and ABC Prioritisation"
- Question:     "Question 1 - Recognise cues"
- Prompt:       One or more lines until options begin
- Options:      "A. ..." .. "E. ..." (may span multiple lines)
- Correct line: "Correct answer: B" OR "Correct answers: A, B, C, D"
- Rationale:    "Detailed rationale:" followed by multi-line rationale until next Question/Case/Module

Output JSON (one file per module):
{
  "moduleTitle": "...",
  "moduleNumber": 1,
  "caseStudies": [
    {
      "caseStudyNumber": 1,
      "caseStudyTitle": "...",
      "narrative": "...",
      "questions": [
        {
          "questionNumber": 1,
          "questionTitle": "...",
          "prompt": "...",
          "options": { "A": "...", ... },
          "correctKeys": ["A","B"],
          "answerType": "single" | "multi",
          "rationale": "..."
        }
      ]
    }
  ]
}
"""

from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional


MODULE_RE = re.compile(r"^Module\s+(\d+)\s*[–-]\s*(.+?)\s*$", re.IGNORECASE)
# Headings sometimes use a plain hyphen "-" or an en-dash "–"
CASE_RE = re.compile(r"^Case Study\s+(\d+)\s*[–-]\s*(.+?)\s*$", re.IGNORECASE)
QUESTION_RE = re.compile(r"^Question\s+(\d+)\s*[–-]\s*(.+?)\s*$", re.IGNORECASE)

OPTION_RE = re.compile(r"^([A-E])\.\s*(.*)$", re.IGNORECASE)
CORRECT_SINGLE_RE = re.compile(r"^Correct answer:\s*([A-E])\s*$", re.IGNORECASE)
CORRECT_MULTI_RE = re.compile(r"^Correct answers:\s*(.+?)\s*$", re.IGNORECASE)

DETAILED_RATIONALE_RE = re.compile(r"^Detailed rationale:\s*(.*)$", re.IGNORECASE)


def _join_prompt_lines(lines: List[str]) -> str:
    # Collapse prompt whitespace while keeping sentences intact.
    joined = " ".join([l.strip() for l in lines if l.strip()])
    return re.sub(r"\s+", " ", joined).strip()


def _parse_correct_keys_from_multi(rest: str) -> List[str]:
    keys = re.findall(r"\b([A-E])\b", rest, flags=re.IGNORECASE)
    out: List[str] = []
    for k in keys:
        kk = k.upper()
        if kk not in out:
            out.append(kk)
    return out


@dataclass
class Question:
    questionNumber: int
    questionTitle: str
    prompt: str = ""
    options: Dict[str, str] = field(default_factory=dict)
    correctKeys: List[str] = field(default_factory=list)
    answerType: str = "multi"
    rationale: str = ""

    def to_json(self) -> dict:
        # Keep options ordered A..E for UI stability.
        ordered_options: Dict[str, str] = {}
        for k in ["A", "B", "C", "D", "E"]:
            if k in self.options:
                ordered_options[k] = self.options[k]
        # Any unknown keys (shouldn't happen) go last.
        for k, v in self.options.items():
            if k not in ordered_options:
                ordered_options[k] = v

        return {
            "questionNumber": self.questionNumber,
            "questionTitle": self.questionTitle,
            "prompt": self.prompt,
            "options": ordered_options,
            "correctKeys": self.correctKeys,
            "answerType": self.answerType,
            "rationale": self.rationale,
        }


@dataclass
class CaseStudy:
    caseStudyNumber: int
    caseStudyTitle: str
    narrative_lines: List[str] = field(default_factory=list)
    questions: List[Question] = field(default_factory=list)

    def to_json(self) -> dict:
        narrative = "\n".join([l.rstrip() for l in self.narrative_lines]).strip()
        return {
            "caseStudyNumber": self.caseStudyNumber,
            "caseStudyTitle": self.caseStudyTitle,
            "narrative": narrative,
            "questions": [q.to_json() for q in self.questions],
        }


def _normalize_line(line: str) -> str:
    return line.rstrip()


def parse_ngn_txt(raw: str) -> List[dict]:
    lines = [_normalize_line(l) for l in raw.splitlines()]

    modules: List[dict] = []
    current_module_number: Optional[int] = None
    current_module_title: Optional[str] = None
    current_cases: List[CaseStudy] = []

    current_case: Optional[CaseStudy] = None
    current_question: Optional[Question] = None

    prompt_lines: List[str] = []
    option_being: Optional[str] = None
    rationale_lines: List[str] = []
    in_rationale = False

    def flush_question() -> None:
        nonlocal current_question, prompt_lines, option_being, rationale_lines, in_rationale
        if current_question is None:
            return
        current_question.prompt = _join_prompt_lines(prompt_lines)
        current_question.rationale = "\n".join([l.rstrip() for l in rationale_lines]).strip()
        current_question.answerType = "single" if len(current_question.correctKeys) <= 1 else "multi"
        if current_case is not None:
            current_case.questions.append(current_question)

        current_question = None
        prompt_lines = []
        option_being = None
        rationale_lines = []
        in_rationale = False

    def flush_case() -> None:
        nonlocal current_case
        if current_case is None:
            return
        current_cases.append(current_case)
        current_case = None

    for line in lines:
        stripped = line.strip()

        # Ignore empty line while preserving paragraphs inside rationale via rationale_lines accumulation.
        if not stripped:
            if current_question is not None and in_rationale:
                rationale_lines.append("")
            continue

        m_mod = MODULE_RE.match(stripped)
        if m_mod:
            if current_question is not None:
                flush_question()
            if current_case is not None:
                flush_case()
            if current_module_number is not None:
                modules.append(
                    {
                        "moduleTitle": current_module_title or "",
                        "moduleNumber": current_module_number,
                        "caseStudies": [c.to_json() for c in current_cases],
                    }
                )
            current_module_number = int(m_mod.group(1))
            current_module_title = m_mod.group(2).strip()
            current_cases = []
            continue

        m_case = CASE_RE.match(stripped)
        if m_case:
            if current_question is not None:
                flush_question()
            if current_case is not None:
                flush_case()
            if current_module_number is None:
                # If no module header appears, assume module 1.
                current_module_number = 1
                current_module_title = "NGN Module"
                current_cases = []
            current_case = CaseStudy(caseStudyNumber=int(m_case.group(1)), caseStudyTitle=m_case.group(2).strip())
            continue

        m_q = QUESTION_RE.match(stripped)
        if m_q:
            if current_case is None:
                continue
            if current_question is not None:
                flush_question()
            current_question = Question(
                questionNumber=int(m_q.group(1)),
                questionTitle=m_q.group(2).strip(),
            )
            prompt_lines = []
            option_being = None
            rationale_lines = []
            in_rationale = False
            continue

        if current_question is not None:
            # In rationale mode, everything continues until the next recognized heading.
            if in_rationale:
                rationale_lines.append(line)
                continue

            m_opt = OPTION_RE.match(stripped)
            if m_opt:
                key = m_opt.group(1).upper()
                val = (m_opt.group(2) or "").strip()
                option_being = key
                current_question.options[key] = val
                continue

            m_correct_single = CORRECT_SINGLE_RE.match(stripped)
            if m_correct_single:
                current_question.correctKeys = [m_correct_single.group(1).upper()]
                option_being = None
                continue

            m_correct_multi = CORRECT_MULTI_RE.match(stripped)
            if m_correct_multi:
                current_question.correctKeys = _parse_correct_keys_from_multi(m_correct_multi.group(1))
                option_being = None
                continue

            m_rationale = DETAILED_RATIONALE_RE.match(stripped)
            if m_rationale:
                in_rationale = True
                remainder = (m_rationale.group(1) or "").strip()
                if remainder:
                    rationale_lines.append(remainder)
                continue

            # Option continuation or prompt continuation
            if option_being is not None and option_being in current_question.options:
                current_question.options[option_being] = (current_question.options[option_being] + " " + stripped).strip()
            else:
                prompt_lines.append(stripped)
            continue

        # Narrative (case story) lines before the first question in a case.
        if current_case is not None and current_question is None:
            current_case.narrative_lines.append(line)

    # Flush at EOF
    if current_question is not None:
        flush_question()
    if current_case is not None:
        flush_case()
    if current_module_number is not None:
        modules.append(
            {
                "moduleTitle": current_module_title or "",
                "moduleNumber": current_module_number,
                "caseStudies": [c.to_json() for c in current_cases],
            }
        )

    return modules


def write_modules(modules: List[dict], out_dir: Path) -> List[Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    written: List[Path] = []
    for m in modules:
        module_num = int(m.get("moduleNumber", 1))
        out_path = out_dir / f"module{module_num}.json"
        out_path.write_text(json.dumps(m, indent=2, ensure_ascii=False), encoding="utf-8")
        written.append(out_path)
    return written


def main() -> int:
    parser = argparse.ArgumentParser(description="Convert NGN TXT (like sample_ngn/sample.txt) into JSON modules.")
    parser.add_argument("input", help="Path to NGN .txt file")
    parser.add_argument(
        "-o",
        "--output-dir",
        default=None,
        help="Output directory. Default: <input-stem>_json next to input.",
    )
    args = parser.parse_args()

    in_path = Path(args.input).expanduser().resolve()
    if not in_path.is_file():
        raise SystemExit(f"Input not found: {in_path}")

    out_dir = Path(args.output_dir).expanduser().resolve() if args.output_dir else in_path.with_name(in_path.stem + "_json")
    raw = in_path.read_text(encoding="utf-8", errors="replace")

    modules = parse_ngn_txt(raw)
    if not modules:
        raise SystemExit("No modules parsed (check TXT format).")

    written = write_modules(modules, out_dir)
    print(f"Wrote {len(written)} module json file(s) to: {out_dir}")
    for p in written:
        print(f"  - {p.name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

