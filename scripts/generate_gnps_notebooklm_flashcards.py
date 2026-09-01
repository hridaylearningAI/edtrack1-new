#!/usr/bin/env python3
"""Generate NotebookLM flashcards for GNPS programs 2–10, one notebook per level."""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = ROOT / "tmp/notebooklm-sources/manifest.json"
STATE_PATH = ROOT / "tmp/notebooklm-flashcards/pipeline-state.json"
RAW_DIR = ROOT / "tmp/notebooklm-flashcards/raw"
BACKUP_DIR = ROOT / "tmp/notebooklm-flashcards/backup-before-nlm-programs-2-10"
PACK_DIR = ROOT / "data/gnps"


def run_nlm(args: list[str], timeout: int = 180) -> dict | str:
    cmd = ["nlm", *args]
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    out = (proc.stdout or "").strip()
    err = (proc.stderr or "").strip()
    if proc.returncode != 0:
        raise RuntimeError(f"{' '.join(cmd)}\nexit {proc.returncode}\nstdout:\n{out}\nstderr:\n{err}")
    if out.startswith("{") or out.startswith("["):
        return json.loads(out)
    return out


def load_json(path: Path, default):
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def save_json(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def extract_id(payload) -> str | None:
    if isinstance(payload, dict):
        for key in ("id", "notebook_id", "artifact_id", "uuid"):
            value = payload.get(key)
            if isinstance(value, str) and value:
                return value
        for nested_key in ("notebook", "artifact", "data", "result"):
            nested = payload.get(nested_key)
            found = extract_id(nested)
            if found:
                return found
    if isinstance(payload, list) and payload:
        return extract_id(payload[0])
    return None


def extract_cards(payload) -> list[dict]:
    if isinstance(payload, dict):
        for key in ("cards", "flashcards", "items"):
            value = payload.get(key)
            if isinstance(value, list):
                return [c for c in value if isinstance(c, dict)]
        nested = payload.get("data") or payload.get("result")
        if nested:
            return extract_cards(nested)
    if isinstance(payload, list):
        return [c for c in payload if isinstance(c, dict)]
    return []


def card_text(card: dict) -> tuple[str, str]:
    front = (
        card.get("front")
        or card.get("term")
        or card.get("question")
        or card.get("prompt")
        or ""
    )
    back = (
        card.get("back")
        or card.get("definition")
        or card.get("answer")
        or card.get("response")
        or ""
    )
    return str(front).strip(), str(back).strip()


def focus_prompt(section_number: int, section_title: str) -> str:
    return (
        f"ONLY Section {section_number}: {section_title}. "
        "Create many distinct study flashcards from this section only: definitions, "
        "key learning points, clinical examples, safety principles, and nursing actions. "
        "Prefer short clear fronts and precise backs grounded only in the sources. "
        "Do not cover other sections."
    )


def ensure_notebook(item: dict, state: dict) -> str:
    key = f"{item['code'].lower()}-level-{item['level']}"
    existing = (state.get("notebooks") or {}).get(key)
    if existing:
        return existing
    payload = run_nlm(["notebook", "create", item["notebookTitle"], "--json"])
    notebook_id = extract_id(payload)
    if not notebook_id:
        raise RuntimeError(f"Could not parse notebook id from {payload}")
    state.setdefault("notebooks", {})[key] = notebook_id
    save_json(STATE_PATH, state)
    print(f"created notebook {key} {notebook_id}", flush=True)
    return notebook_id


def ensure_source(item: dict, notebook_id: str, state: dict) -> None:
    key = f"{item['code'].lower()}-level-{item['level']}"
    if (state.get("sources") or {}).get(key):
        return
    payload = run_nlm(
        [
            "source",
            "add",
            notebook_id,
            "--file",
            item["sourcePath"],
            "--title",
            Path(item["sourcePath"]).name,
            "--wait",
            "--wait-timeout",
            "180",
            "--json",
        ],
        timeout=240,
    )
    state.setdefault("sources", {})[key] = extract_id(payload) or True
    save_json(STATE_PATH, state)
    print(f"uploaded source {key}", flush=True)


def wait_for_artifact(notebook_id: str, artifact_id: str | None, timeout_s: int = 240) -> dict:
    deadline = time.time() + timeout_s
    last = None
    while time.time() < deadline:
        args = ["studio", "status", notebook_id, "--json", "--mcp-compatible"]
        if artifact_id:
            args.extend(["--artifact-id", artifact_id])
        try:
            last = run_nlm(args, timeout=60)
        except Exception as exc:
            last = {"status": "error", "error": str(exc)}
            time.sleep(8)
            continue
        artifacts = []
        if isinstance(last, dict):
            artifacts = last.get("artifacts") or last.get("items") or []
            if not artifacts and last.get("artifact_id"):
                artifacts = [last]
        elif isinstance(last, list):
            artifacts = last
        if artifact_id:
            artifacts = [a for a in artifacts if extract_id(a) == artifact_id] or artifacts
        statuses = []
        for art in artifacts:
            status = str((art or {}).get("status") or (art or {}).get("state") or "").lower()
            statuses.append(status)
            if status in {"completed", "ready", "success", "done"}:
                return art if isinstance(art, dict) else {"status": status}
            if status in {"failed", "error"}:
                raise RuntimeError(f"artifact failed: {art}")
        if artifacts and all(s in {"completed", "ready", "success", "done"} for s in statuses):
            return artifacts[0] if isinstance(artifacts[0], dict) else {"status": statuses[0]}
        time.sleep(8)
    raise TimeoutError(f"Timed out waiting for flashcards on {notebook_id}: {last}")


def ensure_section_deck(item: dict, notebook_id: str, section: dict, state: dict) -> str:
    key = f"{item['code'].lower()}-level-{item['level']}-s{section['number']}"
    existing = (state.get("artifacts") or {}).get(key)
    if existing:
        return existing
    prompt = focus_prompt(section["number"], section["title"])
    args = [
        "flashcards",
        "create",
        notebook_id,
        "--difficulty",
        "medium",
        "--focus",
        prompt,
        "--confirm",
        "--json",
    ]
    last_error: Exception | None = None
    for attempt in range(4):
        try:
            payload = run_nlm(args, timeout=180)
            break
        except Exception as exc:
            last_error = exc
            if attempt == 3:
                raise
            time.sleep(45 * (attempt + 1))
    else:
        raise RuntimeError(f"flashcards create failed for {key}: {last_error}")
    artifact_id = extract_id(payload)
    print(f"queued {key} artifact={artifact_id} payload_keys={list(payload) if isinstance(payload, dict) else type(payload)}", flush=True)
    wait_for_artifact(notebook_id, artifact_id)
    if artifact_id:
        state.setdefault("artifacts", {})[key] = artifact_id
        save_json(STATE_PATH, state)
    return artifact_id or ""


def download_section(item: dict, notebook_id: str, section: dict, artifact_id: str) -> Path:
    code = item["code"].lower()
    out = RAW_DIR / code / f"level-{item['level']}-section-{section['number']}.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    if out.exists() and out.stat().st_size > 0:
        return out
    args = [
        "download",
        "flashcards",
        notebook_id,
        "--output",
        str(out),
        "--format",
        "json",
    ]
    if artifact_id:
        args.extend(["--id", artifact_id])
    last_error: Exception | None = None
    for attempt in range(3):
        try:
            run_nlm(args, timeout=120)
            break
        except Exception as exc:
            last_error = exc
            if attempt == 2:
                raise
            time.sleep(6 * (attempt + 1))
    if not out.exists():
        raise FileNotFoundError(f"download did not create {out}; last_error={last_error}")
    return out


def merge_level(item: dict) -> Path:
    code = item["code"].lower()
    merged: list[dict] = []
    seen: set[tuple[str, str]] = set()
    for section in item["sections"]:
        raw_path = RAW_DIR / code / f"level-{item['level']}-section-{section['number']}.json"
        payload = json.loads(raw_path.read_text(encoding="utf-8"))
        for card in extract_cards(payload):
            front, back = card_text(card)
            if not front or not back:
                continue
            key = (re.sub(r"\s+", " ", front).lower(), re.sub(r"\s+", " ", back).lower())
            if key in seen:
                continue
            seen.add(key)
            merged.append(
                {
                    "id": f"fc-{len(merged) + 1}",
                    "section": int(section["number"]),
                    "front": front,
                    "back": back,
                }
            )
    dest = PACK_DIR / code / f"level-{item['level']}" / "flashcards.json"
    backup = BACKUP_DIR / code / f"level-{item['level']}-flashcards.json"
    if dest.exists() and not backup.exists():
        backup.parent.mkdir(parents=True, exist_ok=True)
        backup.write_bytes(dest.read_bytes())
    save_json(dest, {"cards": merged})
    counts = {s["number"]: 0 for s in item["sections"]}
    for card in merged:
        counts[card["section"]] = counts.get(card["section"], 0) + 1
    print(f"wrote {dest} total={len(merged)} by_section={counts}", flush=True)
    return dest


def process_item(item: dict, state: dict) -> None:
    key = f"{item['code'].lower()}-level-{item['level']}"
    if key in (state.get("completed") or []):
        print(f"skip completed {key}", flush=True)
        return
    notebook_id = ensure_notebook(item, state)
    ensure_source(item, notebook_id, state)
    for section in item["sections"]:
        artifact_id = ensure_section_deck(item, notebook_id, section, state)
        download_section(item, notebook_id, section, artifact_id)
    merge_level(item)
    state.setdefault("completed", []).append(key)
    save_json(STATE_PATH, state)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--only", help="Process one key, e.g. ethtl116-level-1")
    parser.add_argument("--limit", type=int, default=0, help="Process at most N remaining levels")
    args = parser.parse_args()

    manifest = load_json(MANIFEST_PATH, [])
    state = load_json(STATE_PATH, {"notebooks": {}, "sources": {}, "artifacts": {}, "completed": []})
    RAW_DIR.mkdir(parents=True, exist_ok=True)

    selected = []
    for item in manifest:
        key = f"{item['code'].lower()}-level-{item['level']}"
        if args.only and key != args.only:
            continue
        selected.append(item)

    if not selected:
        print("no matching items", file=sys.stderr)
        return 1

    processed = 0
    for item in selected:
        key = f"{item['code'].lower()}-level-{item['level']}"
        print(f"=== {key} {item['notebookTitle']} ===", flush=True)
        process_item(item, state)
        processed += 1
        if args.limit and processed >= args.limit:
            break
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
