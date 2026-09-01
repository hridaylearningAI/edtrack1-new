# Student Learning Notes

Notes are stored in **`student-learning-notes.json`** and loaded by the app. The trial course page renders them in the "Student Learning Note" view.

**S3/CDN:** The app fetches notes from the same content base as slides and manifest: `{NEXT_PUBLIC_H5P_CONTENT_BASE_URL}/student-learning-notes.json`. Upload this file to your S3 bucket (e.g. under `test/`) so it is served from the CDN. If the fetch fails, the app falls back to local `data/student-learning-notes.json`.

## JSON structure

- **courseCode** – e.g. `"ETBUS001"`
- **title** – e.g. `"Developing Critical Thinking"`
- **subtitle** – e.g. `"Student Learning Notes"`
- **sections** – array of:
  - **number** – section number (e.g. `"1"`, `"4.1"` only for subsections)
  - **title** – section heading
  - **content** – array of blocks:
    - `{ "type": "paragraph", "text": "..." }`
    - `{ "type": "list", "items": ["...", "..."] }`
    - `{ "type": "subsection", "number": "4.1", "title": "Observation", "content": [ ... ] }`

## Source format (Word paste)

When pasting from Word into **`data/notes-source.txt`**, use this structure:

```
ETBUS001
Developing Critical Thinking
Student Learning Notes

Section 1. Introduction to Critical Thinking

Paragraph text here. Multiple lines are merged into one paragraph.

Section 2. What Is Critical Thinking?

Another paragraph.

- List item one
- List item two
- List item three

Section 4. Core Skills

Intro paragraph.

Subsection 4.1. Observation

Observation involves paying attention to details...

Example: A worker notices an increase in complaints.

Subsection 4.2. Analysis

Analysis is the ability to break information into smaller parts...
```

- **First 3 lines** – courseCode, title, subtitle (then a blank line)
- **Section N. Title** – starts a new section
- **Subsection N.M. Title** – starts a subsection (nested under the current section)
- **- item** or **• item** – list items (consecutive lines become one list block)
- **Any other line** – paragraph (consecutive lines are merged into one paragraph)

## Generate JSON from Word paste

1. Paste your notes into **`data/notes-source.txt`** using the format above.
2. Run:

   ```bash
   pnpm run notes:parse
   ```

   Or with custom paths:

   ```bash
   node scripts/parse-learning-notes-from-word.mjs path/to/notes.txt -o data/student-learning-notes.json
   ```

3. The app loads **`data/student-learning-notes.json`** (or fetches it from your CDN).

## Files

- **`notes-source.txt`** – paste your Word content here, then run the script.
- **`student-learning-notes.json`** – parsed output (commit or host on CDN).

## Multiple learning notes per course (sections)

For courses where each **section** has its own learning note (e.g. Introduction, Topic 1, Topic 2), you can place one JSON file **inside each section folder** so students see a separate “Student Learning Notes” entry per section in the sidebar.

**Folder structure (section-based):**

Use the same folder names as in your course **manifest.json** (`programOverview.folder` and each `topic.folder`). Put a single learning-notes file in each folder:

```
{content_folder}/
  manifest.json                    ← course structure (Introduction, Topic 1, Topic 2, …)
  Introduction/
    student-learning-notes.json     ← first learning note (e.g. intro / program overview)
  Topic 1/
    student-learning-notes.json     ← learning note for Topic 1
  Topic 2/
    student-learning-notes.json     ← learning note for Topic 2
```

- **Introduction** (or whatever `programOverview.folder` is in manifest) → first note; shown as “Program Overview” (or `programOverview.label`) in the sidebar.
- **Topic 1**, **Topic 2**, … (each `topic.folder` from manifest) → one note per topic; labels come from `topic.label`.

The app loads the course manifest, then tries `{content_folder}/{sectionFolder}/student-learning-notes.json` for each section. If at least one file is found, it returns multiple notes and the trial page shows “Student Learning Notes” in the sidebar with one sub-item per section. Students can open each section’s note from the sidebar.

**Alternative (manifest-based multi-topic):** You can instead use a dedicated subfolder and manifest: `student-learning-notes/manifest.json` with a `topics` array, and one file per topic at `student-learning-notes/{TopicLabel}/student-learning-notes.json`. The section-based approach above uses the main course manifest and section folders instead.

## Multiple courses

To support more than one course, add more JSON files (e.g. `learning-notes-ETBUS002.json`) and in `lib/learning-notes.ts` load by course code or route, or add an API that returns notes by course.
