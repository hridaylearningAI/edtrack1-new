# Approved EdTrack ONE demo workspace

`/platform` is the feature catalog (platform map): every module EdTrack provides. The new DIDAC design language (sidebar, Lordicon, GSAP, unified portal search) is applied to the **Admin / Student / Trainer / Partner** portals. Enter through `/demo` with the dedicated demo account. Clerk authentication and the public homepage are unchanged.

## Investor walkthrough

1. Start at the institution overview. Inspect the enrolment chart and attention items.
2. Choose **Enrol student**, use a fictional name/email and select a course.
3. Open **Students**, search the learner and inspect their record.
4. Open **Learning**, find the chosen course and inspect its cohort.
5. Open **Fees**, search the learner, open their invoice and choose **Simulate payment**.
6. Return to **Overview** to see updated learner, enrolment and fee totals.

All of these changes are in memory within the platform route layout. Navigation between platform pages preserves them; refreshing resets them. No real invoice, payment, message or enrolment is created. The legacy `/admin` SMS workspace is separate and does not consume the new in-memory session changes.

The new directory, learning cohort and fees views share fixtures from `lib/demo-data.ts` through `lib/demo-workspace.ts`. Metrics intentionally use actual fixture counts rather than the arbitrary numbers in the image concept. A learner's latest course enrolment is shown; the fees view includes all their fixture purchases. Other modules retain illustrative preview content under the new shared shell. Active assessment definitions are available in the overview review list; this is not a submitted-assignment marking workflow.

## UI and access

- Landing palette: warm paper, forest primary, blue data, sage/green and terracotta state accents.
- Shell: shadcn-style sidebar with Lordicon nav icons and GSAP micro-motion (entrance + metric hover scale with background icons).
- Locally hosted Bodoni Moda headings and Geist UI; licenses in `public/fonts`.
- Search modules using the top bar or ⌘K / Ctrl+K. Search can still open the existing full SMS.
- Chart period, student/course/invoice search, status filters, record dialogs and sample payments are interactive.
- Mobile navigation and tables scroll within their containers; overview panels stack. Dialogs use native focus trapping and reduced-motion styles remove transitions.
- The app's existing Clerk sign-in gate remains. No public auth bypass was added.

## Validation

- `pnpm build`: passed. Existing Next configuration skips global type/lint validation during builds.
- `pnpm exec tsc -p tsconfig.demo-check.json --pretty false`: passed for demo files and dependencies.
- `npx tsx lib/demo-workspace.test.ts`: passed enrolment validation, normalization, duplicate-email rejection, invoice ownership/amount, fixture isolation and chart periods.
- `git diff --check`: passed.
- Full repository TypeScript check still reports errors in legacy screens outside this change.
- Browser: sample enrolment → learner record → course cohort → invoice → simulated payment → updated overview passed. Search, period changes and empty states checked. Desktop 1586px and mobile 390px inspected. Mobile chart labels measured about 13px; overview/student/fees pages have no horizontal document overflow. Table overflow remains contained.

Browser UI validation used a temporary component harness at `/private/tmp/edtrack-approved-demo-preview`, serving the actual platform source with a mocked account avatar. It is not a production auth substitute; no end-to-end Clerk sign-in was performed. The harness exposes `http://localhost:3102/platform` while running. The real app can run at `http://localhost:3101/demo` via `pnpm run dev --port 3101`.

Visual evidence: `.impeccable/review/demo/`. Approved concept and exact image-generation prompt: `artifacts/demo-ui-concepts/07-hybrid-landing-palette.png` and `selected-direction.json`. Design tokens and component examples: `DESIGN.md` and `.impeccable/design.json`.
