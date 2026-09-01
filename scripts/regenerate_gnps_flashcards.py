#!/usr/bin/env python3
"""
Regenerate richer GNPS flashcards for ETHTL115–124 from notes, quizzes, and decisions.

Cards are tagged with `section` (1–4) so the learn UI can partition accurately.
Every card gets a unique front and a unique back (no repeated Q/A prompts).
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1] / "data" / "gnps"
COURSE_CODES = [
    "ethtl115",
    "ethtl116",
    "ethtl117",
    "ethtl118",
    "ethtl119",
    "ethtl120",
    "ethtl121",
    "ethtl122",
    "ethtl123",
    "ethtl124",
]
SECTIONS = 4
MAX_PER_SECTION = 20
MIN_PER_SECTION = 10

SKIP_PARA_PREFIXES = {
    "learning outcomes",
    "learning outcome",
    "key learning points",
    "introduction",
    "core concepts",
    "clinical example",
    "remember...",
    "what you will learn",
    "why this learning matters",
    "your learning goal",
}

REJECT_CONCEPT_TITLES = {
    "monitor",
    "consider",
    "know",
    "perform",
    "treat",
    "recognise",
    "recognize",
    "explain",
    "describe",
    "identify",
    "apply",
    "use",
    "check",
    "ensure",
    "provide",
    "support",
    "assess",
    "document",
    "escalate",
    "maintain",
    "prevent",
    "promote",
    "review",
    "understand",
    "compare",
    "relate",
    "list",
    "state",
    "define",
    "discuss",
    "demonstrate",
    "calculate",
    "prepare",
    "administer",
    "evaluate",
    "communicate",
    "coordinate",
    "lead",
    "manage",
    "prioritise",
    "prioritize",
    "respond",
    "after",
    "before",
    "during",
    "when",
    "while",
}


def clean(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").replace("\xa0", " ")).strip()


def truncate(text: str, limit: int = 420) -> str:
    text = clean(text)
    if len(text) <= limit:
        return text
    return text[:limit].rsplit(" ", 1)[0] + "…"


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: Any) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def option_text(options: list[dict[str, Any]], option_id: str) -> str:
    for opt in options:
        oid = str(opt.get("id") or opt.get("optionId") or "")
        if oid == str(option_id):
            return clean(str(opt.get("text") or opt.get("label") or ""))
        letter = str(opt.get("letter") or "").upper()
        if letter and letter == str(option_id).upper():
            return clean(str(opt.get("text") or opt.get("label") or ""))
    letters = "ABCD"
    if str(option_id).upper() in letters:
        idx = letters.index(str(option_id).upper())
        if 0 <= idx < len(options):
            return clean(str(options[idx].get("text") or options[idx].get("label") or ""))
    return ""


def quiz_correct_answer(q: dict[str, Any]) -> tuple[str, str]:
    options = list(q.get("options") or [])
    rationale = truncate(str(q.get("rationale") or ""), 280)
    correct_id = q.get("correctOptionId") or q.get("correctAnswer") or q.get("answer")
    if correct_id is not None:
        text = option_text(options, str(correct_id))
        if text:
            return text, rationale
    ids = q.get("correctOptionIds") or []
    if isinstance(ids, list) and ids:
        texts = [option_text(options, str(i)) for i in ids]
        texts = [t for t in texts if t]
        if texts:
            return "; ".join(texts), rationale
    for opt in options:
        if opt.get("correct") or opt.get("isCorrect"):
            return clean(str(opt.get("text") or "")), rationale
    return "", rationale


def is_valid_concept_title(title: str) -> bool:
    title = clean(title)
    words = title.split()
    if not title or len(title) < 8 or len(words) < 2:
        return False
    if words[0].lower() in REJECT_CONCEPT_TITLES and len(words) <= 2:
        return False
    if words[-1].lower() in {
        "after",
        "before",
        "during",
        "with",
        "without",
        "for",
        "of",
        "to",
        "in",
        "on",
        "and",
        "or",
        "the",
        "a",
        "an",
        "being",
        "having",
        "including",
        "using",
        "names",  # incomplete "Medication Names and Classifications"
        "one",
        "two",
        "this",
        "that",
        "these",
        "those",
        "such",
    }:
        return False
    return True


def split_concept_paragraph(text: str) -> tuple[str, str] | None:
    text = clean(text)
    if len(text) < 50:
        return None
    low = text.lower()
    if any(low.startswith(p) for p in SKIP_PARA_PREFIXES):
        return None
    m2 = re.match(r"^([^:]{8,70}):\s+(.{30,})$", text)
    if m2:
        title, body = clean(m2.group(1)), clean(m2.group(2))
        if is_valid_concept_title(title) and not body.lower().startswith(("and ", "or ", "of ", "to ")):
            return title, body
    m = re.match(
        r"^([A-Z][A-Za-z0-9/&\-]*(?:[ \t]+[A-Z][A-Za-z0-9/&\-]*){1,7})([ \t]+)([a-z].+)$",
        text,
    )
    if m:
        title, body = clean(m.group(1)), clean(m.group(3))
        if (
            is_valid_concept_title(title)
            and len(body) >= 40
            and not body.lower().startswith(("and ", "or ", "of ", "to ", "being ", "having "))
        ):
            return title, body
    return None


def cloze_front(text: str, min_words: int = 6) -> str | None:
    """Blank the middle of a statement so each card has a unique prompt."""
    text = clean(text)
    words = text.split()
    if len(words) < min_words:
        return None
    start = max(1, len(words) // 3)
    end = min(len(words) - 1, start + max(2, len(words) // 4))
    if end <= start:
        return None
    front = clean(" ".join(words[:start] + ["____"] + words[end:]))
    if "____" not in front or front.lower() == text.lower():
        return None
    return truncate(front, 220)


def prompt_from_statement(kind: str, section_title: str, text: str) -> tuple[str, str]:
    """Build a unique front/back pair for a teaching statement."""
    text = clean(text)
    back = truncate(text, 420)

    split = split_concept_paragraph(text)
    if split:
        concept, body = split
        return f"Explain: {concept}", truncate(body, 420)

    cloze = cloze_front(text)
    if cloze:
        return cloze, back

    # Short bullets: prefer cloze-like even for short lines
    words = text.split()
    if len(words) >= 4:
        mid = len(words) // 2
        front = clean(" ".join(words[:mid] + ["____"] + words[mid + 1 :]))
        if front.lower() != text.lower():
            return truncate(front, 220), back

    snippet = truncate(text, 90)
    if kind == "outcome":
        front = f"Can you: {snippet}?"
    elif kind == "key_point":
        front = f"Why remember this — {snippet}?"
    elif kind == "list":
        front = f"Recall: {snippet}"
    else:
        front = f"Key idea: {snippet}"
    return truncate(front, 220), back


def cards_from_notes_section(section: dict[str, Any], section_num: int) -> list[dict[str, Any]]:
    title = clean(str(section.get("title") or f"Section {section_num}"))
    cards: list[dict[str, Any]] = []
    seen_fronts: set[str] = set()
    seen_backs: set[str] = set()

    def add(front: str, back: str, kind: str) -> None:
        front, back = clean(front), truncate(back)
        if not front or not back or len(back) < 12:
            return
        if front.lower().rstrip(".?") == back.lower().rstrip(".?"):
            return
        fk, bk = front.lower(), back.lower()
        if fk in seen_fronts or bk in seen_backs:
            return
        # Near-duplicate front stems (same first ~40 chars)
        lead = fk[:40]
        if any(sf.startswith(lead) or lead.startswith(sf[:40]) for sf in seen_fronts):
            return
        seen_fronts.add(fk)
        seen_backs.add(bk)
        cards.append({"section": section_num, "kind": kind, "front": front, "back": back})

    def add_statement(kind: str, text: str) -> None:
        text = clean(text)
        if len(text) < 12:
            return
        front, back = prompt_from_statement(kind, title, text)
        add(front, back, kind)

    content = list(section.get("content") or [])
    pending_list_label: str | None = None
    outcome_paras_remaining = 0

    for block in content:
        btype = block.get("type")
        if btype == "paragraph":
            text = clean(str(block.get("text") or ""))
            low = text.lower().rstrip(":")
            if low in {"learning outcomes", "key learning points", "core concepts"}:
                pending_list_label = low
                outcome_paras_remaining = 4 if low == "learning outcomes" else 0
                continue
            if low in SKIP_PARA_PREFIXES:
                continue

            if pending_list_label == "learning outcomes" and outcome_paras_remaining > 0:
                split = split_concept_paragraph(text)
                if split:
                    concept, body = split
                    add(f"Explain: {concept}", body, "concept")
                else:
                    parts = re.split(
                        r"(?<=[.!?])\s+(?=[A-Z])|(?<=[a-z])\s+(?=(?:Explain|Describe|Identify|Apply|Recognise|Recognize|Perform|Monitor|Assess|Calculate|Prepare|Administer|Document|Evaluate|Provide|Support|Lead|Manage|Coordinate|Prioritise|Prioritize)\b)",
                        text,
                    )
                    for part in parts:
                        part = clean(part)
                        if len(part) >= 20:
                            add_statement("outcome", part)
                outcome_paras_remaining -= 1
                if outcome_paras_remaining <= 0:
                    pending_list_label = None
                continue

            split = split_concept_paragraph(text)
            if split:
                concept, body = split
                add(f"Explain: {concept}", body, "concept")
            elif 80 <= len(text) <= 360 and not text.endswith("?"):
                add_statement("note", text)
            pending_list_label = None
            outcome_paras_remaining = 0
        elif btype == "list":
            items = [clean(x) for x in (block.get("items") or []) if clean(str(x))]
            label = pending_list_label or "key point"
            pending_list_label = None
            outcome_paras_remaining = 0
            for item in items:
                if len(item) < 12:
                    continue
                if label == "learning outcomes":
                    fixed = item if item[0].isupper() else item[0].upper() + item[1:]
                    add_statement("outcome", fixed)
                elif label == "key learning points":
                    add_statement("key_point", item)
                else:
                    add_statement("list", item)
        elif btype == "subsection":
            pending_list_label = None
            outcome_paras_remaining = 0
            sub = clean(str(block.get("title") or block.get("heading") or ""))
            body = clean(str(block.get("text") or block.get("body") or ""))
            if not body:
                nested = block.get("content") or block.get("items") or []
                if isinstance(nested, list):
                    parts = []
                    for n in nested:
                        if isinstance(n, str):
                            parts.append(clean(n))
                        elif isinstance(n, dict):
                            parts.append(clean(str(n.get("text") or "")))
                    body = " ".join(p for p in parts if p)
            if sub and body:
                add(f"What is covered in '{sub}'?", body, "subsection")
            elif sub:
                add(f"Focus of: {sub}", f"Review {title} — {sub}.", "subsection")

    if not cards:
        add(
            f"Recall the focus of: {title}",
            f"Review this section’s core concepts, clinical examples and key learning points for {title}.",
            "anchor",
        )
    return cards


def cards_from_quiz_slice(
    questions: list[dict[str, Any]], section_num: int, limit: int
) -> list[dict[str, Any]]:
    cards: list[dict[str, Any]] = []
    seen_fronts: set[str] = set()
    for q in questions:
        if len(cards) >= limit:
            break
        stem = clean(str(q.get("stem") or q.get("question") or q.get("title") or ""))
        if len(stem) < 20:
            continue
        answer, rationale = quiz_correct_answer(q)
        if not answer:
            continue
        front = truncate(stem, 280)
        if front.lower() in seen_fronts:
            continue
        seen_fronts.add(front.lower())
        back = answer if not rationale else f"{answer}\n\nWhy: {rationale}"
        cards.append(
            {
                "section": section_num,
                "kind": "quiz",
                "front": front,
                "back": truncate(back, 480),
            }
        )
    return cards


def cards_from_decisions(
    decisions: list[dict[str, Any]], section_num: int
) -> list[dict[str, Any]]:
    start = (section_num - 1) * 2
    slice_ = decisions[start : start + 2]
    cards: list[dict[str, Any]] = []
    for d in slice_:
        title = clean(str(d.get("title") or "Clinical decision"))
        first = clean(str(d.get("modelFirst") or ""))
        why = clean(str(d.get("modelWhy") or ""))
        nxt = clean(str(d.get("modelNext") or ""))
        if first:
            cards.append(
                {
                    "section": section_num,
                    "kind": "decision",
                    "front": f"Decision — {title}: what is your first action?",
                    "back": truncate(first + (f" Reason: {why}" if why else ""), 420),
                }
            )
        if nxt:
            cards.append(
                {
                    "section": section_num,
                    "kind": "decision",
                    "front": f"Decision — {title}: what should you check or do next?",
                    "back": truncate(nxt, 360),
                }
            )
    return cards


def quiz_slice_for_section(questions: list[dict[str, Any]], section_num: int) -> list[dict[str, Any]]:
    total = len(questions)
    base = total // SECTIONS
    rem = total % SECTIONS
    start = 0
    for s in range(1, section_num):
        start += base + (1 if s <= rem else 0)
    length = base + (1 if section_num <= rem else 0)
    return questions[start : start + length]


def select_cards_for_section(candidates: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Prefer notes/decisions, fill with quiz; enforce unique fronts and backs."""
    priority = {
        "key_point": 0,
        "concept": 1,
        "outcome": 2,
        "list": 3,
        "subsection": 4,
        "note": 5,
        "decision": 6,
        "quiz": 7,
        "anchor": 8,
    }
    ranked = sorted(
        candidates,
        key=lambda c: (priority.get(str(c.get("kind")), 9), -len(str(c.get("back") or ""))),
    )
    seen_fronts: set[str] = set()
    seen_backs: set[str] = set()
    unique: list[dict[str, Any]] = []
    for c in ranked:
        front = clean(c["front"])
        back = clean(c["back"])
        if not front or not back:
            continue
        if c.get("kind") == "concept":
            title = front[9:] if front.startswith("Explain: ") else front
            if not is_valid_concept_title(title):
                continue
        fk, bk = front.lower(), back.lower()
        if fk in seen_fronts or bk in seen_backs:
            continue
        lead = fk[:40]
        if any(sf.startswith(lead) or lead.startswith(sf[:40]) for sf in seen_fronts):
            continue
        seen_fronts.add(fk)
        seen_backs.add(bk)
        unique.append({**c, "front": front, "back": truncate(back, 480)})

    notes_like = [c for c in unique if c.get("kind") != "quiz"]
    quiz_like = [c for c in unique if c.get("kind") == "quiz"]
    notes_cap = min(12, max(8, len(notes_like)))
    chosen = notes_like[:notes_cap]
    remaining = MAX_PER_SECTION - len(chosen)
    if remaining > 0:
        chosen.extend(quiz_like[:remaining])
    if len(chosen) < MIN_PER_SECTION:
        for pool in (quiz_like, notes_like):
            for c in pool:
                if c in chosen:
                    continue
                chosen.append(c)
                if len(chosen) >= MIN_PER_SECTION:
                    break
            if len(chosen) >= MIN_PER_SECTION:
                break
    return chosen[:MAX_PER_SECTION]


def build_level_flashcards(level_dir: Path) -> dict[str, Any]:
    notes = load_json(level_dir / "notes.json")
    quiz = load_json(level_dir / "quiz.json")
    decisions_path = level_dir / "decision-practice.json"
    decisions = load_json(decisions_path).get("decisions", []) if decisions_path.exists() else []
    questions = list(quiz.get("questions") or [])
    sections = list(notes.get("sections") or [])

    all_cards: list[dict[str, Any]] = []
    global_fronts: set[str] = set()
    global_backs: set[str] = set()

    for si in range(1, SECTIONS + 1):
        section = sections[si - 1] if si - 1 < len(sections) else {"title": f"Section {si}", "content": []}
        candidates: list[dict[str, Any]] = []
        candidates.extend(cards_from_notes_section(section, si))
        candidates.extend(cards_from_decisions(decisions, si))
        candidates.extend(cards_from_quiz_slice(quiz_slice_for_section(questions, si), si, limit=12))
        selected = select_cards_for_section(candidates)
        # Final cross-section uniqueness
        for c in selected:
            fk, bk = clean(c["front"]).lower(), clean(c["back"]).lower()
            if fk in global_fronts or bk in global_backs:
                continue
            global_fronts.add(fk)
            global_backs.add(bk)
            all_cards.append(c)

    out_cards = []
    for i, card in enumerate(all_cards, start=1):
        out_cards.append(
            {
                "id": f"fc-{i}",
                "section": int(card["section"]),
                "front": card["front"],
                "back": card["back"],
            }
        )
    return {"cards": out_cards}


def main() -> None:
    summary: dict[str, Any] = {}
    for code in COURSE_CODES:
        course_dir = ROOT / code
        if not course_dir.exists():
            print(f"skip missing {code}")
            continue
        course_summary: dict[str, Any] = {}
        for level in (1, 2, 3):
            level_dir = course_dir / f"level-{level}"
            if not (level_dir / "notes.json").exists():
                continue
            pack = build_level_flashcards(level_dir)
            write_json(level_dir / "flashcards.json", pack)
            by_section: dict[str, int] = {}
            fronts = [c["front"].lower() for c in pack["cards"]]
            backs = [c["back"].lower() for c in pack["cards"]]
            for c in pack["cards"]:
                key = str(c["section"])
                by_section[key] = by_section.get(key, 0) + 1
            course_summary[f"level-{level}"] = {
                "total": len(pack["cards"]),
                "bySection": by_section,
                "uniqueFronts": len(set(fronts)) == len(fronts),
                "uniqueBacks": len(set(backs)) == len(backs),
            }
        summary[code] = course_summary
        print(code, json.dumps(course_summary))
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
