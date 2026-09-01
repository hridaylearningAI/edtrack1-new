#!/usr/bin/env python3
"""Import hosted GNPS editorial illustrations into public/gnps paths.

  python scripts/generate_gnps_local_images.py --import-hosted
"""

from __future__ import annotations

import argparse
import hashlib
import json
import random
import re
import subprocess
import textwrap
import time
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any
from urllib import error, request


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data" / "gnps"
PUBLIC_DIR = ROOT / "public" / "gnps"
TMP_DIR = ROOT / "tmp" / "gnps-image-prompts"
OLLAMA_URL = "http://127.0.0.1:11434/api/generate"
HOSTED_FILENAME_RE = re.compile(
    r"^gnps-(ethtl1\d+)-l([123])-(case|decision)-(\d+)\.jpeg$",
    re.IGNORECASE,
)
DEFAULT_HOSTED_ASSETS_DIR = Path.home() / (
    ".cursor/projects/Users-hridaygoswami-Desktop-Everything-Baba-bhai-edtech-sms/assets"
)

DEFAULT_OLLAMA_MODEL = "qwen2.5vl:3b"
DEFAULT_DIFFUSERS_MODEL = "stabilityai/sdxl-turbo"

STYLE_PREFIX = (
    "clean flat editorial medical illustration, 2D educational artwork, soft lighting, "
    "simple hospital ward, one nurse and one patient, no photorealism, no extra limbs"
)

NEGATIVE_PROMPT = (
    "photorealistic, photograph, 3d render, uncanny valley, extra fingers, extra arms, "
    "mutated hands, melted face, alien anatomy, horror, blood, gore, graphic injury, "
    "text, watermark, logo, readable monitor text, busy background, duplicate people"
)


@dataclass
class GnpsImageItem:
    course_code: str
    level: int
    kind: str
    item_id: str
    title: str
    source_text: str
    output_path: str
    manifest_path: str
    image_url: str


def slugify(value: str) -> str:
    clean = "".join(ch.lower() if ch.isalnum() else "-" for ch in value.strip())
    while "--" in clean:
        clean = clean.replace("--", "-")
    return clean.strip("-") or "item"


def stable_seed(*parts: str) -> int:
    digest = hashlib.sha256("::".join(parts).encode("utf-8")).hexdigest()
    return int(digest[:8], 16)


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def ensure_parent(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


def collect_items(
    *,
    course_filter: str | None = None,
    level_filter: int | None = None,
    kinds: set[str] | None = None,
) -> list[GnpsImageItem]:
    out: list[GnpsImageItem] = []
    for course_dir in sorted(DATA_DIR.glob("ethtl1*")):
        course_code = course_dir.name.upper()
        if course_filter and course_code != course_filter.upper():
            continue
        for level_dir in sorted(course_dir.glob("level-*")):
            try:
                level = int(level_dir.name.split("-")[-1])
            except ValueError:
                continue
            if level_filter and level != level_filter:
                continue

            cases_path = level_dir / "case-studies.json"
            if cases_path.exists() and (kinds is None or "case" in kinds):
                data = read_json(cases_path)
                for case in data.get("cases", []):
                    item_id = str(case.get("id") or slugify(case.get("title") or "case"))
                    public_rel = (
                        f"gnps/{course_dir.name}/level-{level}/case-study-images/{item_id}.jpeg"
                    )
                    manifest_rel = (
                        f"{course_dir.name}/level-{level}/case-study-images/{item_id}.json"
                    )
                    out.append(
                        GnpsImageItem(
                            course_code=course_code,
                            level=level,
                            kind="case",
                            item_id=item_id,
                            title=str(case.get("title") or item_id),
                            source_text=build_case_source(case),
                            output_path=str(PUBLIC_DIR / public_rel.replace("gnps/", "")),
                            manifest_path=str(TMP_DIR / manifest_rel),
                            image_url="/" + public_rel,
                        )
                    )

            decisions_path = level_dir / "decision-practice.json"
            if decisions_path.exists() and (kinds is None or "decision" in kinds):
                data = read_json(decisions_path)
                for decision in data.get("decisions", []):
                    item_id = str(decision.get("id") or slugify(decision.get("title") or "decision"))
                    public_rel = (
                        f"gnps/{course_dir.name}/level-{level}/decision-practice-images/{item_id}.jpeg"
                    )
                    manifest_rel = (
                        f"{course_dir.name}/level-{level}/decision-practice-images/{item_id}.json"
                    )
                    out.append(
                        GnpsImageItem(
                            course_code=course_code,
                            level=level,
                            kind="decision",
                            item_id=item_id,
                            title=str(decision.get("title") or item_id),
                            source_text=build_decision_source(decision),
                            output_path=str(PUBLIC_DIR / public_rel.replace("gnps/", "")),
                            manifest_path=str(TMP_DIR / manifest_rel),
                            image_url="/" + public_rel,
                        )
                    )
    return out


def build_case_source(case: dict[str, Any]) -> str:
    q_titles = [str(q.get("title") or "").strip() for q in case.get("questions", [])[:3]]
    text = "\n".join(
        part
        for part in [
            f"Title: {case.get('title', '')}",
            f"Scenario: {str(case.get('stem', '')).strip()}",
            f"Assessment focus: {', '.join([q for q in q_titles if q])}",
        ]
        if part.strip()
    )
    return textwrap.shorten(text, width=1600, placeholder=" ...")


def build_decision_source(decision: dict[str, Any]) -> str:
    text = "\n".join(
        part
        for part in [
            f"Title: {decision.get('title', '')}",
            f"Scenario: {str(decision.get('scenario', '')).strip()}",
            f"Model first action: {str(decision.get('modelFirst', '')).strip()}",
            f"Immediate risk: {str(decision.get('modelWhy', '')).strip()}",
        ]
        if part.strip()
    )
    return textwrap.shorten(text, width=1600, placeholder=" ...")


def fallback_prompt_from_source(item: GnpsImageItem) -> str:
    cue = textwrap.shorten(item.title.replace("\n", " ").strip(), width=72, placeholder="...")
    return f"one nurse helping one patient during {cue}, calm ward, simple composition"


def normalize_image_prompt(raw: str) -> str:
    cleaned = " ".join(raw.replace("\n", " ").split()).strip().strip('"').strip("'")
    cleaned = textwrap.shorten(cleaned, width=140, placeholder="")
    if not cleaned.lower().startswith("clean flat"):
        cleaned = f"{STYLE_PREFIX}, {cleaned}"
    return cleaned


def ollama_prompt_request(item: GnpsImageItem) -> str:
    scene_type = "case study" if item.kind == "case" else "decision practice"
    return textwrap.dedent(
        f"""
        Write one short image prompt for a 2D educational medical illustration.
        Return only the prompt sentence. Do not use JSON, bullets, or markdown.
        Keep it under 24 words. Do not describe vital signs, numbers, or chart text.

        Constraints:
        - Flat editorial illustration, not a photograph
        - One nurse and one patient only
        - Hands hidden or simplified, no close-up fingers
        - Calm hospital ward, no gore, no extra limbs
        - No readable text, logos, or monitor numbers

        Program: {item.course_code}
        Level: {item.level}
        Kind: {scene_type}
        Title: {item.title}

        Source:
        {item.source_text}
        """
    ).strip()


def call_ollama(model: str, prompt: str, item: GnpsImageItem) -> str:
    last_body: dict[str, Any] | None = None
    for attempt in range(3):
        payload = json.dumps(
            {
                "model": model,
                "prompt": prompt,
                "stream": False,
                "options": {"temperature": 0.2},
            }
        ).encode("utf-8")
        req = request.Request(
            OLLAMA_URL,
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with request.urlopen(req, timeout=180) as resp:
                body = json.loads(resp.read().decode("utf-8"))
                last_body = body
        except error.URLError:
            if attempt == 2:
                break
            time.sleep(2 * (attempt + 1))
            continue

        raw = str(body.get("response") or "").strip().replace("\n", " ")
        if raw:
            return raw
        time.sleep(1.5 * (attempt + 1))

    fallback = fallback_prompt_from_source(item)
    if last_body:
        print(
            f"ollama-fallback {item.course_code} L{item.level} {item.kind} {item.item_id}",
            flush=True,
        )
    return fallback


def build_manifest_entry(item: GnpsImageItem, prompt_text: str, renderer: str) -> dict[str, Any]:
    prompt = normalize_image_prompt(str(prompt_text or "").strip())
    if not prompt:
        raise RuntimeError(f"Prompt missing for {item.course_code} {item.level} {item.item_id}")
    return {
        **asdict(item),
        "prompt": prompt,
        "negative_prompt": NEGATIVE_PROMPT,
        "alt_text": item.title.strip(),
        "style_notes": "flat editorial medical illustration",
        "renderer": renderer,
        "seed": stable_seed(item.course_code, str(item.level), item.kind, item.item_id),
        "status": "prompted",
        "created_at": int(time.time()),
    }


def write_manifest(path: Path, entry: dict[str, Any]) -> None:
    ensure_parent(path)
    path.write_text(json.dumps(entry, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def load_manifest(path: Path) -> dict[str, Any] | None:
    if not path.exists():
        return None
    return read_json(path)


def load_diffusers_pipeline(model_id: str):
    try:
        import torch
        from diffusers import AutoPipelineForText2Image
    except ImportError as exc:
        raise RuntimeError(
            "Missing diffusers dependencies. Install: python3 -m pip install diffusers transformers accelerate safetensors torch pillow"
        ) from exc

    dtype = torch.float16
    pipe = AutoPipelineForText2Image.from_pretrained(model_id, torch_dtype=dtype)
    device = "mps" if getattr(torch.backends, "mps", None) and torch.backends.mps.is_available() else "cpu"
    pipe = pipe.to(device)
    pipe.set_progress_bar_config(disable=True)
    return pipe, torch, device


def render_manifest_entry(
    entry: dict[str, Any],
    *,
    pipe,
    torch_module,
    device: str,
    width: int,
    height: int,
    steps: int,
    guidance_scale: float,
) -> None:
    out_path = Path(entry["output_path"])
    ensure_parent(out_path)
    gen = torch_module.Generator(device=device).manual_seed(int(entry["seed"]))
    result = pipe(
        prompt=entry["prompt"],
        negative_prompt=entry["negative_prompt"],
        num_inference_steps=steps,
        guidance_scale=guidance_scale,
        width=width,
        height=height,
        generator=gen,
    )
    image = result.images[0]
    image.save(out_path, format="JPEG", quality=90, optimize=True)
    entry["status"] = "rendered"
    entry["rendered_at"] = int(time.time())
    entry["render_width"] = width
    entry["render_height"] = height


def generate_prompts(
    items: list[GnpsImageItem],
    *,
    ollama_model: str,
    renderer: str,
    skip_existing: bool,
) -> list[Path]:
    manifest_paths: list[Path] = []
    for item in items:
        manifest_path = Path(item.manifest_path)
        manifest_paths.append(manifest_path)
        if skip_existing and manifest_path.exists():
            continue
        prompt_text = call_ollama(ollama_model, ollama_prompt_request(item), item)
        entry = build_manifest_entry(item, prompt_text, renderer)
        write_manifest(manifest_path, entry)
        print(f"prompted {item.course_code} L{item.level} {item.kind} {item.item_id}", flush=True)
    return manifest_paths


def render_prompts(
    manifest_paths: list[Path],
    *,
    diffusers_model: str,
    skip_existing: bool,
    width: int,
    height: int,
    steps: int,
    guidance_scale: float,
) -> None:
    pipe, torch_module, device = load_diffusers_pipeline(diffusers_model)
    for path in manifest_paths:
        entry = load_manifest(path)
        if not entry:
            continue
        out_path = Path(entry["output_path"])
        if skip_existing and out_path.exists() and out_path.stat().st_size > 0:
            continue
        render_manifest_entry(
            entry,
            pipe=pipe,
            torch_module=torch_module,
            device=device,
            width=width,
            height=height,
            steps=steps,
            guidance_scale=guidance_scale,
        )
        write_manifest(path, entry)
        print(f"rendered {entry['course_code']} L{entry['level']} {entry['kind']} {entry['item_id']}", flush=True)


def compress_illustration(src: Path, dest: Path, *, max_width: int = 1600, quality: int = 82) -> None:
    ensure_parent(dest)
    try:
        from PIL import Image

        image = Image.open(src).convert("RGB")
        image.thumbnail((max_width, int(max_width * 0.75)), Image.Resampling.LANCZOS)
        image.save(dest, format="JPEG", quality=quality, optimize=True)
        return
    except ImportError:
        pass
    subprocess.run(
        [
            "sips",
            "-Z",
            str(max_width),
            "-s",
            "format",
            "jpeg",
            "-s",
            "formatOptions",
            str(quality),
            str(src),
            "--out",
            str(dest),
        ],
        check=True,
        capture_output=True,
    )


def import_hosted_illustrations(assets_dir: Path) -> int:
    if not assets_dir.exists():
        raise SystemExit(f"Assets directory not found: {assets_dir}")
    imported = 0
    for src in sorted(assets_dir.glob("gnps-*.jpeg")):
        match = HOSTED_FILENAME_RE.match(src.name)
        if not match:
            continue
        course, level, kind, number = match.groups()
        folder = "case-study-images" if kind.lower() == "case" else "decision-practice-images"
        dest = (
            PUBLIC_DIR
            / course.lower()
            / f"level-{level}"
            / folder
            / f"{kind.lower()}-{int(number)}.jpeg"
        )
        if dest.exists() and dest.stat().st_size > 0:
            continue
        compress_illustration(src, dest)
        print(f"imported {dest.relative_to(PUBLIC_DIR)} ({dest.stat().st_size // 1024}KB)", flush=True)
        imported += 1
    print(f"imported {imported} hosted illustrations", flush=True)
    return imported


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate GNPS local images")
    parser.add_argument("--course", help="Filter one course code, e.g. ETHTL115")
    parser.add_argument("--level", type=int, choices=[1, 2, 3], help="Filter one level")
    parser.add_argument(
        "--kind",
        choices=["case", "decision", "both"],
        default="both",
        help="Which content kind to process",
    )
    parser.add_argument("--sample-limit", type=int, default=0, help="Only process first N items")
    parser.add_argument("--ollama-model", default=DEFAULT_OLLAMA_MODEL)
    parser.add_argument("--renderer", choices=["diffusers"], default="diffusers")
    parser.add_argument("--diffusers-model", default=DEFAULT_DIFFUSERS_MODEL)
    parser.add_argument("--skip-existing", action="store_true")
    parser.add_argument("--prompts-only", action="store_true")
    parser.add_argument("--render-only", action="store_true")
    parser.add_argument(
        "--import-hosted",
        action="store_true",
        help="Compress Cursor-hosted illustrations into public/gnps paths and exit",
    )
    parser.add_argument("--assets-dir", type=Path, default=DEFAULT_HOSTED_ASSETS_DIR)
    parser.add_argument("--width", type=int, default=768)
    parser.add_argument("--height", type=int, default=576)
    parser.add_argument("--steps", type=int, default=8)
    parser.add_argument("--force", action="store_true", help="Regenerate even if files already exist")
    parser.add_argument("--guidance-scale", type=float, default=0.0)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.import_hosted:
        import_hosted_illustrations(args.assets_dir)
        return 0
    kinds = None if args.kind == "both" else {args.kind}
    items = collect_items(course_filter=args.course, level_filter=args.level, kinds=kinds)
    if args.sample_limit > 0:
        items = items[: args.sample_limit]
    if not items:
        raise SystemExit("No GNPS items matched the requested filters.")

    random.seed(42)
    manifest_paths = [Path(item.manifest_path) for item in items]
    skip_existing = args.skip_existing and not args.force
    if not args.render_only:
        manifest_paths = generate_prompts(
            items,
            ollama_model=args.ollama_model,
            renderer=args.renderer,
            skip_existing=skip_existing,
        )
    if not args.prompts_only:
        render_prompts(
            manifest_paths,
            diffusers_model=args.diffusers_model,
            skip_existing=skip_existing,
            width=args.width,
            height=args.height,
            steps=args.steps,
            guidance_scale=args.guidance_scale,
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
