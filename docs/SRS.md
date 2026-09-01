# Software Requirements Specification

**Product:** Student Management System (SMS) with embedded Learning Management System (LMS)  
**Reference system:** EdTec Online SMS (`sms.edtec.online`) paired with a marketing/catalog site  
**Document type:** Rebuild / similar-project reference (IEEE 830–inspired)  
**Version:** 1.0  
**Date:** 19 August 2026  
**Status:** Derived from the running Next.js application, not from a prior paper spec

This document describes the **capabilities and rules** of the current SMS+LMS so another team can build a **similar** product. Domain examples (nursing GNPS units, NCLEX mock exams) are the reference curriculum. A similar project may swap those for another profession while keeping the same platform shape.

---

## 1. Introduction

### 1.1 Purpose

Specify functional, data, interface, and quality requirements for a combined:

1. **SMS** — identity, roles, catalog entitlements, carts, payments, enrollments, trials, certificates, support, admin operations, partner/trainer portals.
2. **LMS** — structured course pathways (notes, video, flashcards, quizzes, case studies, decision practice), progress, AI coaching, timed/proctored exams.

Readers: product owners, architects, engineers, QA, and curriculum teams.

### 1.2 Scope

**In scope**

- Multi-portal web application (student, admin, trainer, partner).
- Cross-site authentication with a separate public catalog/marketing application.
- Course catalog metadata, pricing plans, eligibility, and listing flags.
- Guest/email course trials and conversion to paid enrollment.
- In-app competency pathways with per-section and per-activity progress.
- Test-prep diagnostic (free, one completed attempt) and enrolled mock exams with staged content unlocks.
- Cart, coupons, Stripe checkout, webhooks, partial/stage payments.
- Certificate generation and email delivery.
- In-app AI tutor for notes, quiz rationales, and written decision answers.
- Support tickets, course forums, notifications, scheduling, video meetings.
- Exam integrity signals (camera/head-pose style proctoring events).

**Out of scope for a “similar” rebuild (unless explicitly required)**

- Full Australian VET/HE student-management compliance (AVETMISS reporting exists as an admin area in the reference system; treat as optional localization).
- Building the public marketing site itself (only the **contract** with it).
- Authoring every piece of curriculum content (provide the **content model** and one sample pathway).
- Native mobile apps (web-first; responsive is required).

### 1.3 Definitions

| Term | Meaning |
| --- | --- |
| **SMS** | Operational system for people, money, enrollments, and access rights |
| **LMS** | Learning runtime: content playback, assessment, progress |
| **Catalog / portfolio app** | Public marketing and course listing site; students typically sign in there first |
| **SMS app** | This application; intended primary login path is from the catalog |
| **Clerk** | External identity provider (sessions, users) |
| **Supabase** | Postgres + storage used as the system of record |
| **Pathway** | Ordered sequence of learning activities inside a course/level |
| **GNPS** | Reference curriculum: Global Nurse Professional Skills, programs ETHTL115–124 |
| **NCLEX** | Reference test-prep product with free diagnostic and paid mock |
| **EdBot** | In-app AI coach (LLM-backed) |
| **H5P/CDN content** | Slide/video/interactive packages hosted on object storage + CDN |
| **Trial** | Time-bounded, unauthenticated or lightly identified access to a course |
| **Enrollment** | Entitlement record linking a user (or email) to a course/plan |
| **Plan / stage** | Priced SKU that may unlock a subset of LMS content (e.g. NCLEX stages) |

### 1.4 References (in the reference repo)

- Application routes: `app/student`, `app/admin`, `app/trainer`, `app/partner`, `app/api`
- Cross-app auth: `lib/crossAppAuth.ts`, `lib/auth.ts`, `middleware.ts`
- Pathway packs: `lib/gnps/ethtl115.ts`, `data/gnps/`
- Database SQL: `docs/database/`
- Certificates: `docs/CERTIFICATE_SYSTEM.md`
- Content CDN: `docs/H5P_CONTENT_BUCKET_AND_CDN.md`

`README.md` in the reference repo may be stale (older Flask/NextAuth description). Prefer this SRS plus `package.json`, `env.example`, and `docs/database/`.

### 1.5 Document overview

Section 2 is product context. Section 3 is numbered functional requirements. Section 4 is data. Section 5 is interfaces. Section 6 is quality attributes. Section 7 is a rebuild checklist.

---

## 2. Overall description

### 2.1 Product perspective

The platform is **two web applications sharing one identity provider**:

```text
[Catalog / marketing site]  --Clerk session / optional token-->  [SMS + LMS]
        course browse, SEO                         enrollments, learn, pay, admin
```

**Rules the rebuild should keep**

- Direct hits to the SMS root **without** a trusted “came from catalog” signal should not dump users into the full student app as if they arrived through the intended funnel. The reference system sends those users to a **direct-access** explanation page and/or back to the catalog.
- After login, **role** decides home: admin → admin console; trainer → trainer; partner → partner; else student.
- The SMS server uses a **privileged database key** (service role). Authorization must be enforced in API routes, not only in the UI. Middleware in the reference system does **not** fully enforce roles.

### 2.2 Product functions (summary)

1. Identify users and map them to a role and optional trainer/partner profile.
2. Sell and entitle courses (cart, Stripe, admin-created enrollments, payment links).
3. Offer limited trials and convert them.
4. Deliver structured learning and record progress.
5. Deliver high-stakes practice exams with attempt limits and optional proctoring.
6. Coach learners with an LLM grounded in the current activity.
7. Operate the school (admin), teach/schedule (trainer), and refer/enroll (partner).

### 2.3 User classes

| Actor | Goal |
| --- | --- |
| **Visitor / trial learner** | Sample a course with name + email, without a full student account |
| **Student** | Buy or receive access, learn, sit exams, download certificates, get support |
| **Admin** | Manage people, courses, money, unlocks, content flags, communications |
| **Trainer** | Run scheduled sessions, share meeting links, review mock metrics, unlock exam modules, moderate forums, view proctoring |
| **Partner** | Capture enquiries, create attributed enrollments, view commissions |
| **Catalog site** | Hand off an authenticated browser session into SMS |

Role resolution (required):

1. Database `users.role` (primary)
2. Identity-provider public metadata `role` (fallback)
3. Default `student`

Trainer and partner also require a **row** in `trainers` / `partners` (or equivalent) for portal APIs.

### 2.4 Operating environment

| Layer | Reference implementation | Similar-project choice |
| --- | --- | --- |
| App | Next.js 15 App Router, React 19, TypeScript, Tailwind | Any modern full-stack web framework with SSR/API routes |
| Identity | Clerk | Auth0, Cognito, Clerk, or first-party auth — must support two apps, one user pool |
| Data | Supabase Postgres | Any Postgres; RLS optional if APIs use a service role **and** enforce authz |
| Payments | Stripe PaymentIntents / Checkout + webhooks | Stripe or equivalent; webhook is mandatory |
| Email | Resend | Any transactional mailer |
| AI | Google Gemini (`gemini-2.5-flash-lite`) | Any LLM with a server-side key; never expose the key to the browser |
| Media | S3 + CloudFront (H5P-style folders) | Any CDN; stable URL scheme |
| Meetings | Microsoft Graph / Teams | Zoom, Meet, or Teams |
| Hosting | Vercel and/or AWS Amplify | Any Node host |
| Proctoring | MediaPipe Tasks Vision in the browser | Optional; store events server-side |

### 2.5 Constraints and assumptions

- **Assumption:** Curriculum for at least one full pathway exists as structured JSON (or CMS) matching the activity types below.
- **Constraint:** Paid access is granted only after a trusted payment webhook or an admin/partner enrollment action — never from the client alone.
- **Constraint:** Free diagnostic exams persist **one completed attempt** per person.
- **Constraint:** Course trials: **one active trial per course per email**.
- **Constraint:** OTP (if used) expires in about **10 minutes**.
- **Constraint:** Cross-app handoff tokens/payloads expire in about **5 minutes**.
- **Legal:** Store only the minimum PII needed; exam video/camera data is sensitive; disclose proctoring in the UI.

### 2.6 Pedagogical model (LMS core)

A **similar LMS** should implement this **level pack**, even if subject matter changes.

For each **program** (course) and each **level** (typically 3):

| Sequence | Activity | Learner job | System job |
| --- | --- | --- | --- |
| 1 | Section notes (×4 sections typical) | Read illustrated notes | Track section completion; optional AI “explain this” |
| 2 | Section video | Watch | Gate or mark complete |
| 3 | Flashcards | Self-test recall | Track reviewed cards |
| 4 | Section quiz | MCQ with rationales | Score, persist attempt, AI analysis |
| After sections | Case studies (×5 typical) | Apply knowledge to a scenario + illustration | Multi-question check; hide broken images |
| After cases | Decision practice (×8 typical) | Write/select clinical decisions | Compare to model answer via AI |
| End of level | Level quiz / recap | Summative check | Progress + certificate eligibility rules as configured |

**Reference GNPS programs (10 units × 3 levels):** Foundations; Safety & infection; Medication; Adult MS I; Adult MS II; Maternal/newborn; Paediatric; Mental health; Professional ethics; Clinical skills.

**Reference level names:** Qualified Nurse → Internationally Qualified Nurse (IQN) → Global Nurse Professional.

Illustrations for cases/decisions are static assets served from `/public/...` or a CDN, 4:3 editorial stills, with `onError` hiding the figure so the scenario still works.

### 2.7 Course taxonomy (SMS catalog)

The reference catalog uses categories that control **whether SMS learning is offered**:

| Category idea | SMS LMS? |
| --- | --- |
| Skills / professional development | Yes |
| Self-paced / DIY | Yes |
| Traditional VET | Listing only / no SMS pathway in reference |
| Higher education | Listing only / no SMS pathway in reference |
| Test preparation | Yes (staged unlocks) |

A similar project should keep **`listed_on_portfolio`** (or equivalent) so the catalog site and SMS stay in sync.

---

## 3. Specific requirements

Requirements use **MoSCoW**: Must / Should / Could. IDs are stable for test cases.

### 3.1 Authentication and access (AUTH)

| ID | Pri | Requirement |
| --- | --- | --- |
| AUTH-01 | Must | Support sign-in via a shared identity provider used by the catalog site and the SMS. |
| AUTH-02 | Must | Accept a catalog handoff (`from=catalog`/`from=portfolio` and optional short-lived token). Validate signature/expiry server-side. |
| AUTH-03 | Must | After session establishment, redirect by role (admin / trainer / partner / student). |
| AUTH-04 | Must | Unauthenticated or non-handoff visits to SMS home show a **direct-access** page, not a fake “already enrolled” dashboard. |
| AUTH-05 | Should | Sync identity-provider user → local `users` row on first SMS use (`/api/auth/me` or equivalent). |
| AUTH-06 | Should | Optional email OTP for verification (6 digits, ~10 minute TTL, hashed at rest). |
| AUTH-07 | Must | Never trust client-supplied `role`. |
| AUTH-08 | Must | Student APIs require an authenticated student (or admin acting in support); admin APIs require admin; trainer/partner APIs require role **and** profile row. |
| AUTH-09 | Could | Dev-only OTP echo in API responses; **forbidden in production**. |

### 3.2 Student portal (STU)

| ID | Pri | Requirement |
| --- | --- | --- |
| STU-01 | Must | Dashboard of current enrollments, progress, and next activity. |
| STU-02 | Must | List completed units/courses and issued certificates. |
| STU-03 | Should | Financial snapshot (purchases, outstanding payment links). |
| STU-04 | Should | Personal schedule of upcoming sessions. |
| STU-05 | Must | Support ticket create/list/reply. |
| STU-06 | Should | In-app notifications with read state and user settings. |
| STU-07 | Must | Course player for entitled courses only (enrollment paid/active, or valid trial). |
| STU-08 | Must | Request content unlocks (e.g. extra exam modules) for admin/trainer approval. |

### 3.3 Catalog, plans, and entitlements (CAT)

| ID | Pri | Requirement |
| --- | --- | --- |
| CAT-01 | Must | Courses have code, title, category, description, images, listing flags, trial flags, duration. |
| CAT-02 | Must | Courses have one or more **plans** (price, currency, what they unlock: full course vs stage). |
| CAT-03 | Should | Eligibility rules (prerequisites, professional group) stored as data, not only copy. |
| CAT-04 | Should | “Interest” / enquiry capture for partners and catalog CTAs. |
| CAT-05 | Must | Enrollment record: user or email, course, plan, payment status, dates, optional partner attribution. |

### 3.4 Trials (TRL)

| ID | Pri | Requirement |
| --- | --- | --- |
| TRL-01 | Must | Start trial with **email + name + courseId** when `trial_enabled`. |
| TRL-02 | Must | Reject a second **active** trial for the same course + email. |
| TRL-03 | Should | Default length from course `trial_duration_days` or 7 days. |
| TRL-04 | Must | Persist trial progress separately from paid enrollment progress. |
| TRL-05 | Must | Convert trial → enrollment without losing completed sections where possible. |
| TRL-06 | Must | Trial learner can use the same pathway UI as enrolled students, with purchase CTAs. |

### 3.5 Learning pathway player (LMS)

| ID | Pri | Requirement |
| --- | --- | --- |
| LMS-01 | Must | Address every activity with a stable **page id** (level, kind, index) for deep links and progress. |
| LMS-02 | Must | Render notes (markdown or structured blocks) with optional figure URLs. |
| LMS-03 | Must | Play video from CDN URL pattern `{base}/{course}/level-{n}/...`. |
| LMS-04 | Must | Flashcards: front/back, shuffle, mark known. |
| LMS-05 | Must | Quizzes: MCQ, optional multi-select, rationale after submit, persist attempt. |
| LMS-06 | Must | Case study: scenario text, 4:3 illustration, questions; hide image on load error. |
| LMS-07 | Must | Decision practice: scenario, illustration, learner response, model answer, optional AI compare. |
| LMS-08 | Must | Record section completion and quiz scores against `course_id` + `user_id` (or trial id). |
| LMS-09 | Should | Activity log for auditing (opened, completed, time spent if available). |
| LMS-10 | Should | Content overrides table so admins can replace a default pack item without code deploy. |
| LMS-11 | Must | Unauthorized users receive 401/403, not another student’s content. |

### 3.6 Test-prep exams (EXM)

Modeled on NCLEX free + enrolled mock; rename for other exams.

| ID | Pri | Requirement |
| --- | --- | --- |
| EXM-01 | Must | **Free diagnostic:** fixed item count (reference: 80 questions, stratified by program). |
| EXM-02 | Must | Pass rule configurable (reference: 6 correct per program block of 8). |
| EXM-03 | Must | **One completed free attempt** per student identity (unique constraint on `student_id` and/or `clerk_user_id`). Incomplete attempts may resume until submit. |
| EXM-04 | Must | Enrolled mock: question banks by topic; **plan stage** caps how many topics are unlocked (reference: stage1=0 extra, stage2=6, stage3=8 — configure in data). |
| EXM-05 | Should | Next-generation / case-style exam pages distinct from simple MCQ. |
| EXM-06 | Should | Browser proctoring: permissioned camera, head-pose / tab signals, event log (`exam_proctoring_events`). Do not claim “no cheating”; claim “signals recorded”. |
| EXM-07 | Must | Trainers/admins can unlock additional topics via `course_unlock_requests` workflow. |

### 3.7 Commerce (PAY)

| ID | Pri | Requirement |
| --- | --- | --- |
| PAY-01 | Must | Cart with line items tied to `course_id` + `plan_id`. |
| PAY-02 | Must | Create Stripe (or equivalent) checkout/payment intent server-side. |
| PAY-03 | Must | Webhook `checkout.session.completed` (and payment_failed) updates enrollment **idempotently**. |
| PAY-04 | Should | Coupons / promotion codes via payment provider. |
| PAY-05 | Should | Certificate add-on / upgrade purchase. |
| PAY-06 | Should | Partial payments / stage upgrades via RPC or transactional function (`upsert_enrollment_partial_payment` pattern). |
| PAY-07 | Must | Admin can create an enrollment and send a payment link email. |
| PAY-08 | Must | Never mark paid solely because the thank-you page loaded. |

### 3.8 Certificates (CRT)

| ID | Pri | Requirement |
| --- | --- | --- |
| CRT-01 | Must | Issue certificate when enrollment rules say so (`with_certificate` / completion). |
| CRT-02 | Must | Human-readable unique number (reference: `CERT-YYYY-XXXXXX-XXXX`). |
| CRT-03 | Should | Client or server PDF (html2canvas/jsPDF or server PDF). |
| CRT-04 | Should | Email certificate to student via transactional mail. |

### 3.9 AI coach (BOT)

| ID | Pri | Requirement |
| --- | --- | --- |
| BOT-01 | Must | Server-only LLM key; 503 if missing. |
| BOT-02 | Should | Notes: explain selected passage in the course’s teaching voice. |
| BOT-03 | Should | Quiz: explain why an option is right/wrong using stored rationales. |
| BOT-04 | Should | Quiz: post-attempt analysis of missed items. |
| BOT-05 | Should | Decision practice: compare learner write-up to the model answer; no invented clinical facts beyond the stem. |
| BOT-06 | Must | Prompt isolation: send only the current activity context, not other students’ data. |

### 3.10 Admin console (ADM)

The reference admin surface is large. A similar MVP **Must** include the starred items; the rest are **Should**.

| ID | Pri | Requirement |
| --- | --- | --- |
| ADM-01 | Must | Student search, profile, enrollments, payment status. |
| ADM-02 | Must | Course CRUD, plans, trial flags, images (storage bucket). |
| ADM-03 | Must | Manual enrollment / payment-link issuance. |
| ADM-04 | Must | Approve or deny unlock requests (exam modules, GNPS, etc.). |
| ADM-05 | Should | Stripe product/price sync helpers. |
| ADM-06 | Should | Forums moderation. |
| ADM-07 | Should | Invoice / finance views. |
| ADM-08 | Should | Notification broadcast. |
| ADM-09 | Could | Dummy/test account tools (disable in production). |
| ADM-10 | Could | Localized compliance exports (e.g. AVETMISS). |

### 3.11 Trainer portal (TRN)

| ID | Pri | Requirement |
| --- | --- | --- |
| TRN-01 | Must | Authenticated trainer profile gate. |
| TRN-02 | Should | Timetable of exam/coaching events. |
| TRN-03 | Should | Create/share meeting URLs (Graph/Teams or other). |
| TRN-04 | Should | Mock-exam metrics for assigned students. |
| TRN-05 | Should | Unlock exam modules. |
| TRN-06 | Should | Course forums. |
| TRN-07 | Could | Review proctoring event summaries (not raw camera archives unless legally designed). |

### 3.12 Partner portal (PRT)

| ID | Pri | Requirement |
| --- | --- | --- |
| PRT-01 | Must | Authenticated partner profile gate. |
| PRT-02 | Should | Enquiry inbox. |
| PRT-03 | Should | Create enrollments attributed to the partner. |
| PRT-04 | Should | Commission / referral reporting. |
| PRT-05 | Could | Partner API clients and per-course grants (B2B). |

### 3.13 Communications (COM)

| ID | Pri | Requirement |
| --- | --- | --- |
| COM-01 | Must | Transactional email: OTP, welcome, payment receipt, payment link, certificate. |
| COM-02 | Must | Branded From address and logo URL configuration. |
| COM-03 | Should | Course forums: threads and posts scoped to course members. |
| COM-04 | Should | Notification center + email opt-out settings. |

### 3.14 Scheduling (SCH)

| ID | Pri | Requirement |
| --- | --- | --- |
| SCH-01 | Should | Store timetable events (title, start/end, course, meeting URL). |
| SCH-02 | Should | Student and trainer views of the same events. |

---

## 4. Data requirements

### 4.1 Core entities

Implement at least these tables (names may vary).

**Identity and access**

- `users` — id, clerk/idp id, email, name, role, student number, timestamps  
- `otp_codes` — email, hash, expires_at, consumed  
- `trainers`, `partners` — profile + status  
- `partner_api_clients`, `partner_api_course_grants` (optional B2B)

**Catalog and money**

- `courses`, `course_categories`, `course_plans`, `course_eligibility`  
- `carts`, `cart_items`  
- `purchases`, `purchase_items` (or rely on Stripe + enrollments)  
- `enrollments` — status, plan, paid_at, partner_id, with_certificate  
- `enrollment_partial_payments`  
- `discounts` / coupon mapping  
- `trial_enrollments`, `course_trial_progress`

**Learning**

- `course_content_sections`, `course_content_overrides`  
- `course_section_progress`, `course_quiz_attempts`, `course_activity_log`  
- `course_resource_access`  
- `course_unlock_requests`  
- Pathway JSON in repo or CMS: notes, decks, quizzes, cases, decisions, flashcards

**Exams**

- `nclex_free_attempts` / generic `diagnostic_attempts` — unique completed per user  
- `nclex_mock_attempts` / `mock_attempts`  
- `exam_proctoring_events`  
- `nclex_timetable_events` / `timetable_events`

**School ops**

- `certificates`  
- `support_tickets`, ticket replies, ticket sequences  
- `student_number_sequences`  
- `notifications`, `notification_settings`, `notification_reads`  
- `course_forums`, threads, posts  
- `assessments` (trainer-marked, if used)  
- `course_interests`

### 4.2 Critical uniqueness rules

| Rule | Why |
| --- | --- |
| One completed free diagnostic per identity | Prevents farming the pretest |
| One active trial per (email, course) | Prevents infinite trial reset |
| Idempotent payment webhook (provider event id unique) | Prevents double enrollment |
| Unique certificate number | Verification |

### 4.3 Content addressing

**Public LMS assets (reference):**

- Notes images: `/gnps/shared/student-learning-notes-images/NN.jpeg` or catalog CDN  
- Case images: `/gnps/{code}/level-{n}/case-study-images/{caseId}.jpeg`  
- Decision images: `/gnps/{code}/level-{n}/decision-practice-images/{decisionId}.jpeg`  
- Videos/slides: `{H5P_BASE}/{folder}/...`

Next.js image optimization may be **off** (`images.unoptimized`) when using mixed CDNs; a similar project should document the same choice.

---

## 5. External interface requirements

### 5.1 User interfaces

- Responsive web: desktop-first learning player; usable tablet; mobile for dashboard/support.
- Distinct visual themes per portal (student learning CSS is large and custom in the reference app).
- Accessibility: images have alt text (case title); hide failed images; keyboard for quizzes **Should**.

### 5.2 Software interfaces

| System | Direction | Notes |
| --- | --- | --- |
| Identity provider | In | Session JWT / cookies |
| Postgres | In/out | Service role from server only |
| Stripe | Out + webhook in | Verify webhook signatures |
| Email | Out | OTP and lifecycle |
| LLM | Out | Per-request, timeout, 503 on failure |
| Object storage / CDN | Out (URLs in) | Private authoring bucket optional |
| Graph/Teams | Out | Meeting create |
| Catalog site | In | Handoff query params; shared CORS/cookie domain strategy |

### 5.3 Communication interfaces

- HTTPS only.
- SMS public URL and catalog URL as env (`NEXT_PUBLIC_STUDENT_MANAGEMENT_URL`, `NEXT_PUBLIC_PORTFOLIO_URL`).
- Cookie name for optional SMS session bridge (reference: `edtec_auth`).

### 5.4 Configuration (no secrets in this document)

Required env groups: identity public + secret keys; database URL + server key; Stripe secret + webhook secret; mailer key + from address; catalog URL; content CDN base; app URL; LLM key; optional Graph tenant credentials.

---

## 6. Non-functional requirements

| ID | Area | Requirement |
| --- | --- | --- |
| NFR-01 | Security | Secrets only on the server. Webhook and OTP hashes. |
| NFR-02 | Security | Authorize every API by role + resource ownership. |
| NFR-03 | Privacy | PII minimization; retention policy for exam events. |
| NFR-04 | Reliability | Payment and enrollment writes are transactional; webhooks retry-safe. |
| NFR-05 | Availability | Learning player must work if AI is down (BOT APIs 503; content still readable). |
| NFR-06 | Performance | Pathway JSON loaded incrementally or cached; do not block TTI on LLM. |
| NFR-07 | Audit | Enrollment, payment, unlock, and certificate issuance are attributable. |
| NFR-08 | i18n | Reference UI is English; currency AUD in seeds — make locale/currency configurable. |
| NFR-09 | Quality | Reference build currently ignores ESLint/TS errors; a **similar** project **Should not** copy that. |
| NFR-10 | Ops | Separate production Stripe/Clerk/Supabase projects from test. |

---

## 7. Use cases (happy path)

### UC-1 Catalog to class

1. Learner signs in on the catalog site.  
2. Clicks “Go to student portal”.  
3. SMS validates handoff, syncs user, routes to `/student`.  
4. Dashboard shows enrollments.

### UC-2 Trial then buy

1. Visitor starts trial (email, name, course).  
2. Completes some sections; progress stored.  
3. Checkout for a plan; webhook marks enrollment paid.  
4. Progress converted; full pathway available.

### UC-3 Pathway session

1. Student opens program level 1.  
2. Completes notes → video → flashcards → quiz for section 1.  
3. Continues remaining sections, then cases, then decisions.  
4. EdBot explains a missed quiz item.

### UC-4 Free diagnostic once

1. Student starts free exam.  
2. Submits; scores stored.  
3. Second submit is rejected.

### UC-5 Staged test-prep purchase

1. Student buys stage 2 plan.  
2. Webhook unlocks the configured topic cap.  
3. Student requests remaining topics; trainer/admin approves.

### UC-6 Admin enroll

1. Admin creates enrollment + payment link.  
2. Email sent.  
3. Student pays; access granted; optional welcome email.

---

## 8. Rebuild guide (similar project)

### 8.1 Suggested delivery slices

1. **Skeleton:** identity, roles, empty student/admin shells, env, Postgres.  
2. **Entitlement:** courses, plans, enrollments, Stripe webhook, cart.  
3. **One pathway:** one course × three levels × notes/video/flashcards/quiz.  
4. **Cases + decisions + images.**  
5. **Trials + convert.**  
6. **AI coach** on notes/quiz.  
7. **Diagnostic exam + one-attempt rule.**  
8. **Staged unlocks + unlock requests.**  
9. **Certificates + email.**  
10. **Trainer schedule + forums + tickets.**  
11. **Partner attribution.**  
12. **Proctoring events (optional).**  
13. **Catalog handoff.**

### 8.2 What to copy vs replace

| Keep as-is (pattern) | Replace (content / brand) |
| --- | --- |
| Dual-app identity handoff | School name, domains, Clerk instance |
| Role model + portals | Copy and colors |
| Pathway page-id + progress tables | ETHTL codes, nursing cases |
| One-attempt diagnostic | NCLEX item bank |
| Stripe webhook entitlement | Prices, product names |
| Illustration URL scheme + hide-on-error | Artwork |
| EdBot as server-side explainer | Prompt voice, model vendor |

### 8.3 Explicit non-goals for an MVP similar system

- Re-implement every admin screen on day one.  
- Pixel-match the reference CSS (~thousands of lines of GNPS player styles).  
- Host 390+ illustrations before the player works with placeholders.  
- Port AVETMISS unless the school is an Australian RTO that needs it.

### 8.4 Acceptance tests (minimum)

- [ ] Handoff from catalog logs a student into SMS; random SMS URL does not.  
- [ ] Paying via Stripe (test mode) creates paid enrollment only after webhook.  
- [ ] Replay of the same webhook does not duplicate enrollment.  
- [ ] Trial cannot be started twice while active.  
- [ ] Free exam cannot be completed twice.  
- [ ] Student A cannot read student B progress.  
- [ ] Case image 404 does not blank the scenario.  
- [ ] Missing LLM key does not block reading notes.  
- [ ] Admin-only routes 403 for students.

---

## 9. Requirement traceability (modules → code in the reference app)

| Module | Reference locations |
| --- | --- |
| Auth / handoff | `middleware.ts`, `lib/crossAppAuth.ts`, `lib/auth.ts`, `app/api/auth/*`, `app/api/consume-cross-app-token` |
| Student UI | `app/student/**` |
| Trial | `app/api/trials/*`, `app/student/course/trial` |
| GNPS pathway | `lib/gnps/ethtl115.ts`, `data/gnps/`, `public/gnps/` |
| NCLEX | `app/api/quiz/nclex-free`, `app/api/progress/nclex-mock`, `app/student/course/[courseId]/nclex-*` |
| Cart / pay | `app/api/carts/items`, `app/api/payments/*`, `app/api/stripe/*` |
| EdBot | `lib/edbot.ts`, `app/api/notes/explain`, `app/api/quiz/explain`, `app/api/quiz/analyze`, `app/api/decision/compare` |
| Admin | `app/admin/**`, `app/api/admin/**` |
| Trainer / partner | `app/trainer/**`, `app/partner/**` |
| Schema | `docs/database/*.sql` |

---

## 10. Revision history

| Version | Date | Notes |
| --- | --- | --- |
| 1.0 | 2026-08-19 | Initial SRS distilled from the production SMS+LMS (Clerk, Supabase, Stripe, GNPS ETHTL115–124, NCLEX trial/mock, EdBot, dual-app auth). |

---

*This specification is a rebuild aid. It does not grant a license to copy proprietary curriculum text, exam items, or artwork. Implementers must supply their own content and comply with payment, privacy, and education regulations in their jurisdiction.*
