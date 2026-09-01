#!/usr/bin/env python3
"""
Generate manifest.json for S3/CDN course content from a folder's structure.

Usage:
  python3 generate_content_manifest.py /path/to/content/folder

The manifest is always created inside the provided folder at <folder>/manifest.json.

The script scans immediate subdirectories and builds:
  - programOverview: from a folder named "Introduction" (or --intro-folder)
  - topics: from folders matching "Topic N" (N = 1, 2, 3, ...), sorted by N

Skips: "Practice Q", "Quiz", and "Topic N.M" (subsection) folders.
"""

import argparse
import json
import os
import re
import sys


# Folders that are not slide sections (don't add to manifest)
SKIP_FOLDERS = frozenset({"practice q", "quiz"})

# Topic folder pattern: "Topic 1", "Topic 2", "Topic 10" (not "Topic 1.1")
TOPIC_FOLDER_RE = re.compile(r"^Topic\s+(\d+)$", re.IGNORECASE)


def get_immediate_subdirs(folder_path: str) -> list[str]:
    if not os.path.isdir(folder_path):
        return []
    return sorted(
        name for name in os.listdir(folder_path)
        if os.path.isdir(os.path.join(folder_path, name))
    )


def build_manifest(
    folder_path: str,
    intro_folder: str | None = None,
    intro_label: str = "Program Overview",
) -> dict:
    subdirs = get_immediate_subdirs(folder_path)
    if not subdirs:
        return {"topics": []}

    # Prefer explicit intro folder, else look for "Introduction"
    intro_name = (intro_folder or "").strip()
    if not intro_name:
        for name in subdirs:
            if name.strip().lower() == "introduction":
                intro_name = name
                break
    # Only include programOverview if an Introduction folder exists (so courses without it hide it in the app)
    has_intro = bool(intro_name and any(name.strip().lower() == (intro_name or "").strip().lower() for name in subdirs))

    # Topic folders: "Topic 1", "Topic 2", ... (exclude "Topic 1.1", "Practice Q", "Quiz")
    topic_entries: list[tuple[int, str]] = []
    for name in subdirs:
        if name.strip().lower() in SKIP_FOLDERS:
            continue
        if name.strip().lower() == intro_name.lower():
            continue
        match = TOPIC_FOLDER_RE.match(name.strip())
        if match:
            topic_entries.append((int(match.group(1)), name))

    topic_entries.sort(key=lambda x: x[0])
    topics = [
        {
            "id": f"topic-{n}",
            "folder": folder_name,
            "label": folder_name,
        }
        for n, folder_name in topic_entries
    ]

    result: dict = {"topics": topics}
    if has_intro and intro_name:
        result["programOverview"] = {
            "folder": intro_name,
            "label": intro_label,
        }
    return result


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Generate manifest.json for S3/CDN course content from a folder.",
    )
    parser.add_argument(
        "folder",
        nargs="?",
        default=".",
        help="Content folder path (subdirs = Introduction, Topic 1, Topic 2, ...). manifest.json is created inside this folder. Default: current directory.",
    )
    parser.add_argument(
        "--intro-folder",
        default="",
        help="Program overview folder name (default: auto-detect 'Introduction').",
    )
    parser.add_argument(
        "--intro-label",
        default="Program Overview",
        help="Label for program overview in sidebar (default: Program Overview).",
    )
    args = parser.parse_args()

    folder_path = os.path.abspath(os.path.normpath(args.folder))
    if not os.path.isdir(folder_path):
        print(f"Error: not a directory: {folder_path}", file=sys.stderr)
        return 1

    manifest = build_manifest(
        folder_path,
        intro_folder=args.intro_folder or None,
        intro_label=args.intro_label,
    )
    output_path = os.path.join(folder_path, "manifest.json")

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)

    n_topics = len(manifest["topics"])
    print(f"Wrote {output_path}")
    if "programOverview" in manifest:
        print(f"  programOverview: {manifest['programOverview']['folder']} -> {manifest['programOverview']['label']}")
    else:
        print(f"  programOverview: (omitted — no Introduction folder)")
    print(f"  topics: {n_topics} ({', '.join(t['folder'] for t in manifest['topics'][:5])}{'...' if n_topics > 5 else ''})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
