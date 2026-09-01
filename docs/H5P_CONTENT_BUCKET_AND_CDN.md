# H5P Content Bucket & CDN

## Env and per-course folder

- **`NEXT_PUBLIC_H5P_CONTENT_BASE_URL`** – Base URL for course content (e.g. your CDN or S3 base, **without** a trailing path). Example: `https://d1yyshitp0zb6s.cloudfront.net`.
- In **Admin → Courses → Add/Edit course**, the **Content folder (in-app player)** field is the folder name under this base. URLs are built automatically as:
  - `{base}/{content_folder}/manifest.json`
  - `{base}/{content_folder}/student-learning-notes.json`
  - Slides: `{base}/{content_folder}/{topic_folder}/1.png`, etc.
- If **Content folder** is empty, the app uses the base URL only (single global course). When set (e.g. `test` or `ETBUS001`), that course’s content is loaded from `{base}/{folder}/...`.

## Bucket URL (direct S3)

- **Base URL:** `https://edtec-online-h5p-content.s3.us-east-1.amazonaws.com/test/`
- Content is served from the `test/` prefix. A CDN (e.g. CloudFront) may sit in front of this bucket; the CDN URL can be used instead for better performance and caching.

## Folder structure (inside `test/`)

```
test/
├── manifest.json                    ← optional: defines sidebar and folder mapping (see below)
├── student-learning-notes.json      ← optional: Student Learning Notes (see below)
├── Introduction/
│   └── (slide images: 1.png, 2.png, ...)
├── case-study.md                  ← optional: one case study per course (Markdown)
├── Topic 1/
│   └── (slide images: 1.png, 2.png, ...)
├── Topic 2/
│   └── (slide images)
├── Practice Q/                      ← optional: practice slides shown before each topic quiz
│   ├── Topic 1.1/                   ← first topic quiz (Topic 1)
│   │   └── (slide images: 1.png, 2.png, ...)
│   ├── Topic 1.2/                   ← second topic quiz (Topic 2)
│   ├── Topic 1.3/                   ← third topic quiz (Topic 3)
│   └── ... (Topic 1.4, Topic 1.5, etc.)
├── ... (more topics as needed)
└── Quiz/
    └── (word file for quiz)
```

## Dynamic course structure (manifest.json)

Upload **`manifest.json`** at the content base (e.g. `test/manifest.json`) so the trial course sidebar and slide mapping update automatically.

**Format:**

```json
{
  "programOverview": { "folder": "Introduction", "label": "Program Overview" },
  "topics": [
    { "id": "topic-1", "folder": "Topic 1", "label": "Topic 1" },
    { "id": "topic-2", "folder": "Topic 2", "label": "Topic 2" },
    { "id": "topic-3", "folder": "Topic 3", "label": "Topic 3" }
  ]
}
```

- **programOverview** – Folder and label for the first section (Program Overview).
- **topics** – One entry per topic. Each topic gets a **Slides** view (images from `folder`) and a **Quiz** view in the sidebar.
- Folder names must match the folder names in your bucket (e.g. `Introduction`, `Topic 1`). The app will load slides from `{base}/{folder}/1.png`, `2.png`, etc.

If `manifest.json` is missing or the request fails, the app falls back to a default structure (Introduction + Topic 1 + Topic 2). See `data/manifest.example.json` for a copy-paste example.

## Lecture slides manifest (optional — faster slide viewer)

Upload **`slides-manifest.json`** at the course content root (same shape as `practice-q.json`), or configure via **Admin → Slides manifest** (`/admin/slides-manifest`) → **Scan CDN → Save** (stores in `course_content_overrides.slides_manifest`).

```json
{
  "folders": [
    { "folder": "Introduction", "slides": ["1.png", "2.png"] },
    { "folder": "Topic 1", "slides": ["01.png", "02.png", "03.png"] }
  ]
}
```

When present, the learn page loads slide counts and filenames from this manifest (no sequential image probing) and preloads adjacent slides only.

## Practice Q (optional popup before quiz)

When a user opens a topic quiz for the first time in a session, they see an optional popup: **"Would you like to view Practice Q slides before the quiz?"** If they choose **Yes**, the app loads slides from **`Practice Q/Topic 1.X/`** where X is the topic number: first topic → `Topic 1.1`, second → `Topic 1.2`, third → `Topic 1.3`, and so on. Slide images follow the same pattern: `1.png`, `2.png`, etc. If they choose **No**, they go straight to the quiz. A **"Finish and go to Quiz"** button in the Practice Q view returns them to the quiz.

## Student Learning Notes (student-learning-notes.json)

Upload **`student-learning-notes.json`** at the same content base (e.g. `test/student-learning-notes.json`) to serve the Student Learning Note page from S3/CDN. The app fetches it via `GET /api/learning-notes`, which requests `{BASE_URL}/student-learning-notes.json` and falls back to local `data/student-learning-notes.json` if the request fails. Format and field descriptions are in `data/README-LEARNING-NOTES.md`.

Use these paths when building content URLs, e.g.:
- Introduction slides: `{BASE_URL}Introduction/`
- Topic 1 slides: `{BASE_URL}Topic 1/`
- Quiz file: `{BASE_URL}Quiz/`

## Case study (one per course)

Add a single **`case-study.md`** file at the course content root (e.g. `test/case-study.md` or `ETBUS002/case-study.md`). The app shows it as a **Case Study** item in the sidebar (after Program Overview). Use standard Markdown: `#`, `##`, `###` headings, `**bold**`, paragraphs, and `-` or `*` lists. If the file is missing, the Case Study page shows “No case study for this course.”

## If you forgot the CDN URL

1. **AWS CloudFront (if you use it)**
   - Open [CloudFront console](https://console.aws.amazon.com/cloudfront/) → **Distributions**.
   - Find the distribution whose **Origin** is `edtec-online-h5p-content.s3.us-east-1.amazonaws.com` (or the bucket name).
   - The CDN URL is the **Distribution domain name**, e.g. `d1234abcd.cloudfront.net`.
   - Use `https://d1234abcd.cloudfront.net/test/` as the content base URL (with `/test/` if that’s the origin path).

2. **Other CDNs (Cloudflare, etc.)**
   - Check the CDN provider’s dashboard for the custom domain or CDN URL pointing at this bucket.

3. **Use S3 direct for now**
   - You can use the bucket URL as-is:  
     `https://edtec-online-h5p-content.s3.us-east-1.amazonaws.com/test/`  
   - Ensure the bucket (or the `test/` prefix) allows public read if content is loaded in the browser.

## How the app uses it

Set **one** base URL in the app (env var below). The app will use it for all content paths (Introduction, Topic 1, Quiz, etc.). When you find the CDN URL, update this env var and redeploy; no code change needed.

- **Env var (recommended):** `NEXT_PUBLIC_H5P_CONTENT_BASE_URL`
- **Example (S3 direct):**  
  `NEXT_PUBLIC_H5P_CONTENT_BASE_URL=https://edtec-online-h5p-content.s3.us-east-1.amazonaws.com/test/`
- **Example (CDN – CloudFront):**  
  `NEXT_PUBLIC_H5P_CONTENT_BASE_URL=https://d1yyshitp0zb6s.cloudfront.net/test`  
  (Distribution domain: `d1yyshitp0zb6s.cloudfront.net`)

No trailing slash is required; the app can normalize when building paths.

## Slide images in the trial course

The trial course loads slide images from the CDN when `NEXT_PUBLIC_H5P_CONTENT_BASE_URL` is set. It expects filenames:

- `Introduction/1.png`, `Introduction/2.png`, …
- `Topic 1/1.png`, `Topic 1/2.png`, …
- `Topic 2/1.png`, `Topic 2/2.png`, …

If an image fails to load (e.g. 404), the trial page falls back to the placeholder slide. To use a different pattern, edit `lib/content-url.ts` → `getSlideImageUrl()`.
