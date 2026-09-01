#!/usr/bin/env python3
"""
Generate practice-q.json from a course content folder. Lists Practice Q subfolders
and the slide image filenames in each, then sorts them and writes practice-q.json.

Usage:
  python3 generate_practice_q_manifest.py /path/to/course/content/folder

Expects structure:
  <folder>/
    Practice Q/
      Topic 1.1/
        1.png, 2.png, ...   (or Topic 1_1.png, Topic 1_2.png, etc.)
      Topic 1.2/
        ...
  practice-q.json is written at <folder>/practice-q.json
"""

import argparse
import json
import os
import re
import sys

# Image extensions to include as slides
SLIDE_EXTENSIONS = frozenset({".png", ".jpg", ".jpeg", ".webp"})


def natural_sort_key(name: str):
    """Sort key so '2.png' < '10.png', 'Topic 1_2.png' < 'Topic 1_10.png'."""
    parts = re.split(r"(\d+)", name)
    return [(0, int(part)) if part.isdigit() else (1, part.lower()) for part in parts if part]


def get_immediate_subdirs(folder_path: str) -> list[str]:
    if not os.path.isdir(folder_path):
        return []
    return sorted(
        name for name in os.listdir(folder_path)
        if os.path.isdir(os.path.join(folder_path, name))
    )


def get_slide_filenames_in_folder(folder_path: str) -> list[str]:
    if not os.path.isdir(folder_path):
        return []
    files = [
        name for name in os.listdir(folder_path)
        if os.path.isfile(os.path.join(folder_path, name))
        and os.path.splitext(name)[1].lower() in SLIDE_EXTENSIONS
    ]
    return sorted(files, key=natural_sort_key)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Generate practice-q.json from course content folder (lists Practice Q folders and their slide images).",
    )
    parser.add_argument(
        "folder",
        nargs="?",
        default=".",
        help="Course content folder path (should contain 'Practice Q/' with Topic N.M subfolders). Default: current directory.",
    )
    args = parser.parse_args()

    folder_path = os.path.abspath(os.path.normpath(args.folder))
    if not os.path.isdir(folder_path):
        print(f"Error: not a directory: {folder_path}", file=sys.stderr)
        return 1

    practice_q_path = os.path.join(folder_path, "Practice Q")
    if not os.path.isdir(practice_q_path):
        print(f"No 'Practice Q' folder found under {folder_path}. Writing empty manifest.", file=sys.stderr)
        out = {"folders": []}
    else:
        folders_out: list[dict[str, list[str]]] = []
        for sub_name in get_immediate_subdirs(practice_q_path):
            sub_path = os.path.join(practice_q_path, sub_name)
            slides = get_slide_filenames_in_folder(sub_path)
            if slides:
                folders_out.append({"folder": sub_name, "slides": slides})
            else:
                print(f"  (skip {sub_name}: no slide images)", file=sys.stderr)
        out = {"folders": folders_out}

    out_path = os.path.join(folder_path, "practice-q.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2)
    print(f"Wrote {out_path} with {len(out['folders'])} folder(s).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
